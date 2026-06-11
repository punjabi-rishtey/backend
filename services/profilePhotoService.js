const cloudinary = require("../config/cloudinary");

const MAX_PROFILE_PICTURES = 10;
const PROFILE_PHOTO_FOLDER = "profile_pictures";

class ProfilePhotoError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ProfilePhotoError";
    this.statusCode = statusCode;
  }
}

const parseCloudinaryPublicId = (url) => {
  if (!url || typeof url !== "string") return "";

  try {
    const normalizedUrl = url.startsWith("//")
      ? `https:${url}`
      : url.startsWith("http")
        ? url
        : `https://${url}`;
    const parsed = new URL(normalizedUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1 || uploadIndex + 1 >= parts.length) return "";

    let assetParts = parts.slice(uploadIndex + 1);
    const versionIndex = assetParts.findIndex((part) => /^v\d+$/.test(part));
    if (versionIndex !== -1) {
      assetParts = assetParts.slice(versionIndex + 1);
    }

    return assetParts.join("/").replace(/\.[^/.]+$/, "");
  } catch (error) {
    return "";
  }
};

const normalizePhotoUrlForCompare = (url) => {
  if (!url || typeof url !== "string") return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (/^http:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http:\/\//i, "https://");
  }

  if (/^https:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const isSameProfilePhoto = (asset, imageUrl) => {
  const requestedUrl = normalizePhotoUrlForCompare(imageUrl);
  const assetUrl = normalizePhotoUrlForCompare(asset?.url);

  if (requestedUrl && assetUrl && requestedUrl === assetUrl) {
    return true;
  }

  const requestedPublicId = parseCloudinaryPublicId(imageUrl);
  const assetPublicId = asset?.public_id || parseCloudinaryPublicId(asset?.url);

  return Boolean(
    requestedPublicId &&
      assetPublicId &&
      requestedPublicId === assetPublicId
  );
};

const normalizeProfilePhotoAssets = (user) => {
  const urls = Array.isArray(user.profile_pictures)
    ? user.profile_pictures.filter(Boolean)
    : [];
  const existingAssets = Array.isArray(user.profile_picture_assets)
    ? user.profile_picture_assets
    : [];
  const assetsByUrl = new Map(
    existingAssets
      .filter((asset) => asset && asset.url)
      .map((asset) => [asset.url, asset])
  );

  const normalizedAssets = urls.map((url) => {
    const existing = assetsByUrl.get(url);
    return {
      url,
      public_id: existing?.public_id || parseCloudinaryPublicId(url),
      uploaded_at: existing?.uploaded_at,
      source: existing?.source || "legacy",
    };
  });

  user.profile_pictures = urls;
  user.profile_picture_assets = normalizedAssets;

  if (user.profile_picture && !urls.includes(user.profile_picture)) {
    user.profile_picture = urls[0] || "";
  }

  return normalizedAssets;
};

const profilePhotoPayload = (user) => {
  const profilePictures = Array.isArray(user.profile_pictures)
    ? user.profile_pictures
    : [];

  return {
    profile_pictures: profilePictures,
    profile_picture: user.profile_picture || profilePictures[0] || "",
  };
};

const uploadBufferToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: PROFILE_PHOTO_FOLDER,
        resource_type: "image",
        transformation: [{ width: 500, height: 500, crop: "limit" }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(file.buffer);
  });

const uploadProfilePhotoFiles = async (files, source) => {
  const uploadedAssets = [];

  try {
    for (const file of files || []) {
      const result = await uploadBufferToCloudinary(file);
      uploadedAssets.push({
        url: result.secure_url,
        public_id: result.public_id,
        uploaded_at: new Date(),
        source,
      });
    }
    return uploadedAssets;
  } catch (error) {
    await destroyProfilePhotoAssets(uploadedAssets, { ignoreErrors: true });
    throw error;
  }
};

const destroyProfilePhotoAsset = async (asset) => {
  const publicId = asset?.public_id || parseCloudinaryPublicId(asset?.url);
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId);
};

const destroyProfilePhotoAssets = async (assets, options = {}) => {
  const { ignoreErrors = false } = options;
  const seenPublicIds = new Set();

  for (const asset of assets || []) {
    const publicId = asset?.public_id || parseCloudinaryPublicId(asset?.url);
    if (!publicId || seenPublicIds.has(publicId)) continue;

    seenPublicIds.add(publicId);
    try {
      await destroyProfilePhotoAsset({ ...asset, public_id: publicId });
    } catch (error) {
      if (!ignoreErrors) throw error;
      console.error("Error deleting Cloudinary profile photo:", error.message);
    }
  }
};

const uploadProfilePhotosForUser = async (user, files, source) => {
  if (!files || files.length === 0) {
    throw new ProfilePhotoError("Image file is required!", 400);
  }

  const existingAssets = normalizeProfilePhotoAssets(user);
  if (existingAssets.length + files.length > MAX_PROFILE_PICTURES) {
    throw new ProfilePhotoError(
      `Maximum ${MAX_PROFILE_PICTURES} profile pictures allowed`,
      400
    );
  }

  const uploadedAssets = await uploadProfilePhotoFiles(files, source);
  const nextAssets = [...existingAssets, ...uploadedAssets];

  try {
    user.profile_picture_assets = nextAssets;
    user.profile_pictures = nextAssets.map((asset) => asset.url);
    if (!user.profile_picture) {
      user.profile_picture = user.profile_pictures[0] || "";
    }

    await user.save();
  } catch (error) {
    await destroyProfilePhotoAssets(uploadedAssets, { ignoreErrors: true });
    throw error;
  }

  return profilePhotoPayload(user);
};

const deleteProfilePhotoForUser = async (user, imageUrl) => {
  if (!imageUrl) {
    throw new ProfilePhotoError("Image URL is required", 400);
  }

  const existingAssets = normalizeProfilePhotoAssets(user);
  const assetToDelete = existingAssets.find((asset) =>
    isSameProfilePhoto(asset, imageUrl)
  );
  if (!assetToDelete) {
    throw new ProfilePhotoError("Image not found in profile", 400);
  }

  await destroyProfilePhotoAsset(assetToDelete);

  const nextAssets = existingAssets.filter(
    (asset) => !isSameProfilePhoto(asset, imageUrl)
  );
  user.profile_picture_assets = nextAssets;
  user.profile_pictures = nextAssets.map((asset) => asset.url);

  if (isSameProfilePhoto({ url: user.profile_picture }, imageUrl) || !user.profile_picture) {
    user.profile_picture = user.profile_pictures[0] || "";
  }

  await user.save();
  return profilePhotoPayload(user);
};

const setPrimaryProfilePhotoForUser = async (user, imageUrl) => {
  const existingAssets = normalizeProfilePhotoAssets(user);

  if (!imageUrl) {
    user.profile_picture = "";
    await user.save();
    return profilePhotoPayload(user);
  }

  const selectedAsset = existingAssets.find((asset) =>
    isSameProfilePhoto(asset, imageUrl)
  );

  if (!selectedAsset) {
    throw new ProfilePhotoError("Image not found in your uploaded pictures", 400);
  }

  user.profile_picture = selectedAsset.url;
  await user.save();
  return profilePhotoPayload(user);
};

const deleteAllProfilePhotosForUser = async (user, options = {}) => {
  const assets = normalizeProfilePhotoAssets(user);
  await destroyProfilePhotoAssets(assets, options);
  user.profile_picture_assets = [];
  user.profile_pictures = [];
  user.profile_picture = "";
};

module.exports = {
  MAX_PROFILE_PICTURES,
  ProfilePhotoError,
  parseCloudinaryPublicId,
  normalizePhotoUrlForCompare,
  normalizeProfilePhotoAssets,
  profilePhotoPayload,
  uploadProfilePhotoFiles,
  uploadProfilePhotosForUser,
  deleteProfilePhotoForUser,
  setPrimaryProfilePhotoForUser,
  deleteAllProfilePhotosForUser,
  destroyProfilePhotoAssets,
};
