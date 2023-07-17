const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeServerAndDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
    process.exit(1);
  }
};

initializeServerAndDb();

// API POST Register API
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `
  SELECT * FROM user WHERE username = '${username}';
  `;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    // Create
    const isBelow5Char = password.length;
    if (isBelow5Char < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createUserDetails = `
        INSERT INTO
        user (username, name, password, gender, location)
        VALUES
        (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
        )
        `;
      await db.run(createUserDetails);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// API 2 Log in API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `
  SELECT * FROM user WHERE username = '${username}';
  `;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// API 3 Change Password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const selectUserQuery = `
  SELECT * FROM user WHERE username = '${username}';
  `;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      // Update New Password
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePassword = `
              UPDATE user
              SET
              password = '${hashedPassword}'
              WHERE username = '${username}';
              `;
        await db.run(updatePassword);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
