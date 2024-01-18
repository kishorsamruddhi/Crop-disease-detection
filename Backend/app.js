const express = require("express");
const bcrypt = require("bcrypt");
const app = express();
const mysql = require("mysql");
const cors = require("cors");
const db = mysql.createPool({
  connectionLimit: 100,
  host: "127.0.0.1", //This is your localhost IP
  user: "user", // "newuser" created in Step 1(e)
  password: "gvrv", // password for the new user
  database: "userDB", // Database name
  port: "3306", // port name, "3306" by default
});
db.getConnection((err, connection) => {
  if (err) throw err.sqlMessage;
  console.log("DB connected successful: " + connection.threadId);
});

app.use(cors());
const port = 3000;

app.use(express.json());
app.listen(port, () => console.log(`Server Started on port ${port}...`));

//CREATE USER
app.post("/createUser", async (req, res) => {
  const { gender, email, userName, userPass } = req.body;
  if (!gender || !email || !userName || !userPass) {
    return res.json({
      isSuccess: false,
      error: "Please fill all the fields!",
    });
  }
  const hashedPassword = await bcrypt.hash(userPass, 10);
  try {
    db.getConnection(async (err, connection) => {
      if (err) throw err;
      const sqlSearch = "SELECT * FROM userTable WHERE email = ?";
      const search_query = mysql.format(sqlSearch, [email]);
      const sqlInsert = "INSERT INTO userTable VALUES (?,?,?,?)";
      const insert_query = mysql.format(sqlInsert, [
        userName,
        hashedPassword,
        email,
        gender,
      ]);
      await connection.query(search_query, async (err, result) => {
        if (err) throw err;
        console.log(result.length);
        if (result.length != 0) {
          connection.release();
          return res.json({
            isSuccess: true,
            msg: "User Already Exist!",
          });
        } else {
          await connection.query(insert_query);
          return res.json({
            isSuccess: true,
            data: req.body,
            msg: "User Created !",
          });
        }
      });
    });
  } catch (error) {
    return res.json({
      isSuccess: false,
      error: error.message,
    });
  }
});

//LOGIN (AUTHENTICATE USER)
app.post("/login", (req, res) => {
  const { email, userPass } = req.body;
  if (!email || !userPass) {
    return res.json({
      isSuccess: false,
      error: "Please fill all the fields!",
    });
  }
  db.getConnection(async (err, connection) => {
    if (err) throw err;
    const sqlSearch = "Select * from userTable where email = ?";
    const search_query = mysql.format(sqlSearch, [email]);
    await connection.query(search_query, async (err, result) => {
      connection.release();
      if (err) throw err;
      if (result.length == 0) {
        return res.json({
          isSuccess: false,
          error: "User Not Found!",
        });
      } else {
        const hashedPassword = result[0].userPass;

        if (await bcrypt.compare(userPass, hashedPassword)) {
          return res.json({
            isSuccess: true,
            msg: "Login Successfull!",
          });
        } else {
          return res.json({
            isSuccess: false,
            error: "Invalid Credentials!",
          });
        }
      }
    });
  });
});
