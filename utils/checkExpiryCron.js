const mongoose = require("mongoose");
const User = require("../models/User");
const Subscription = require("../models/Subscription");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Failed", error);
    process.exit(1);
  }

  console.log('Running daily subscription check...');

  try {
    const now = new Date();

    // Get expired subscriptions
    const expiredSubscriptions = await Subscription.find({
      expiresAt: { $lt: now },
    });

    if (expiredSubscriptions.length === 0) {
      console.log("No expired subscriptions found today.");
    } else {
      for (const sub of expiredSubscriptions) {
        const userId = sub.user;
        // Update user status to "Expired"
        await User.findByIdAndUpdate(userId, { status: "Expired" });
        console.log(`User ${userId} status set to Expired`);
      }
    }
  } catch (error) {
    console.error("Error running cron job:", error);
  } finally {
    mongoose.disconnect();
  }
})();


// const cron = require('node-cron');
// const mongoose = require("mongoose");
// const User = require("../models/User");
// const Subscription = require("../models/Subscription");

// try {
//   await mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   });
//   console.log("MongoDB Connected Successfully");
// } catch (error) {
//   console.error("MongoDB Connection Failed", error);
//   process.exit(1);
// }


// // Runs every minute
// cron.schedule('0 0 * * *', async () => {
//   console.log('Running daily subscription check...');


//   try {
//     const now = new Date();

//     // Get expired subscriptions
//     const expiredSubscriptions = await Subscription.find({
//       expiresAt: { $lt: now },
//     });

//     if (expiredSubscriptions.length === 0) {
//       console.log("No expired subscriptions found today.");
//       return;
//     }

//     for (const sub of expiredSubscriptions) {
//       const userId = sub.user;

//       // Update user status to "Expired"
//       await User.findByIdAndUpdate(userId, { status: "Expired" });

//       console.log(`User ${userId} status set to Expired`);
//     }
//   } catch (error) {
//     console.error("Error running cron job:", error);
//   }
// });


// console.log('Expiry-check Cron worker running...');
