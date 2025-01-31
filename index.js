require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const { ObjectId } = require("mongodb");
const port = process.env.PORT || 9000;
const app = express();
const cors = require("cors");
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://squaresmfl.netlify.app",
  ],
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(morgan("dev"));

// const uri = "mongodb://127.0.0.1:27017"; // Local MongoDB URI, you can change to Atlas URI if required
const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.ey46t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function initializeMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

initializeMongoDB(); // Ensure MongoDB is initialized before starting the app

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .send({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).send({ message: "Invalid or expired token." });
  }
};

const formatDate = (dateString) => {
  const [year, month, day] = dateString.split("-"); // Split the date into year, month, and day
  return `${day}-${month}-${year}`; // Return the formatted date as "dd-mm-yyyy"
};

async function run() {
  try {
    const db = client.db("squareManagement");
    const usersCollection = db.collection("users");
    // Add your MongoDB queries or collection logic here.

    //complete add user in usercollection
    // Complete add user in user collection
    app.post("/add-user", async (req, res) => {
      const {
        name,
        idNo,
        designation,
        mobileNo,
        photo,
        shift,
        serviceType,
        joinDate, // joinDate comes in "yyyy-mm-dd" format
      } = req.body;

      // Validate required fields
      if (
        !name ||
        !idNo ||
        !designation ||
        !mobileNo ||
        !photo ||
        !shift ||
        !serviceType ||
        !joinDate
      ) {
        return res.status(400).json({ message: "All fields are required." });
      }

      try {
        // Check if a user with the same idNo already exists
        const existingUser = await usersCollection.findOne({ idNo });

        if (existingUser) {
          return res
            .status(400)
            .json({ message: "This employee is already registered." });
        }

        // Convert joinDate from "yyyy-mm-dd" to "dd-mm-yyyy"
        const formattedJoinDate = formatDate(joinDate);

        // Create a new user document
        const newUser = {
          name,
          idNo,
          designation,
          mobileNo,
          photo,
          shift,
          serviceType,
          joinDate: formattedJoinDate,
          extra1: "", // Insert formatted date
          extra2: "", // Insert formatted date
          extra3: "", // Insert formatted date
          extra4: "", // Insert formatted date
          extra5: "", // Insert formatted date
        };

        // Insert the new user into the collection
        const result = await usersCollection.insertOne(newUser);

        if (result.insertedId) {
          return res.status(201).json({
            message: "User added successfully!",
            userId: result.insertedId,
          });
        } else {
          return res.status(500).json({ message: "Failed to add user." });
        }
      } catch (error) {
        console.error("Error adding user:", error);
        return res.status(500).json({ message: "Internal server error." });
      }
    });

    //get user
    app.get("/users", async (req, res) => {
      try {
        // Fetch all users from the collection
        const users = await usersCollection.find().toArray();

        // Check if users are found
        if (users.length > 0) {
          return res.status(200).json(users); // Send users as a response
        } else {
          return res.status(404).json({ message: "No users found." });
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Internal server error." });
      }
    });

    app.get("/users/:id", async (req, res) => {
      const { id } = req.params; // Get the user ID from the URL parameter

      // Check if the ID is a valid ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid user ID" }); // Return a 400 error if invalid
      }

      try {
        // Convert the string ID to MongoDB's ObjectId
        const convertId = new ObjectId(id);

        // Fetch the user based on the converted ObjectId
        const user = await usersCollection.findOne({ _id: convertId });

        if (user) {
          return res.status(200).json(user); // Send the user data as a response
        } else {
          return res.status(404).json({ message: "User not found." }); // If no user found
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({ message: "Internal server error." });
      }
    });
  } catch (error) {
    console.error("Error in database operations:", error);
  }
}

run().catch(console.error);

app.get("/", (req, res) => {
  res.send("Hello from Backend...");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
