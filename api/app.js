const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = 3000;
const SECRET_KEY = "secret";
const DB_PATH = path.join(__dirname, "storage", "database.sqlite");


const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
});

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true })); // Support form-encoded bodies
app.use(cors());
app.use(cookieParser()); // Middleware to parse cookies


// Ensure storage directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Connect to SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log("Connected to the SQLite database at", DB_PATH);
    }
});

// Create users table
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    otp TEXT,
    role TEXT NOT NULL,
    amount REAL DEFAULT 0
)`);

// Create coffee table
db.run(`CREATE TABLE IF NOT EXISTS coffee (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    image TEXT
)`);

// Create purchase table
db.run(`CREATE TABLE IF NOT EXISTS purchase (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    coffee_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (coffee_id) REFERENCES coffee (id)
)`);

// Create comments table
db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    coffee_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (coffee_id) REFERENCES coffee (id)
)`);

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    var token = authHeader && authHeader.split(" ")[1];
    if (!token) token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.user = user;
        next();
    });
};

// Login API
app.post("/api/login", (req, res) => {
    var { username, password } = req.body;
    // username = username.replaceAll('\'','\\\'');
    // password = password.replaceAll('\'','\\\'');
    db.get(
        `SELECT * FROM users WHERE username = '${username}' and password = '${password}'`,
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!user) {
                return res.status(401).json({ error: "Invalid credentials" });
            }
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                SECRET_KEY,
                { expiresIn: "1000h" },
            );
            res.cookie("token", token, {
                httpOnly: true, // Prevents JavaScript from accessing the cookie
                secure: process.env.NODE_ENV === "production", // Secure in production (HTTPS)
                sameSite: "None", // Prevents CSRF attacks
                maxAge: 1000 * 60 * 60 * 1000, // Expiry (1000 hours)
            });
            res.json({ token, userId: user.id });
        },
    );
});

app.post("/api/logout", (req, res) => {
    res.clearCookie("token", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
    });
    res.json({ message: "Logged out successfully" });
});

app.post("/api/register", (req, res) => {
    const { name, username, password, role } = req.body;
    db.get(
        `SELECT * FROM users WHERE username = '${username}'`,
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (user) {
                return res.status(400).json({
                    error: "Username already taken",
                });
            }
            const insertQuery =
                `INSERT INTO users (name, username, password, role, amount) VALUES ('${name}', '${username}', '${password}', '${role}', 1000)`;
            db.run(insertQuery, function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({
                    message: "User registered successfully",
                });
            });
        },
    );
});

app.get("/api/stats", authenticateToken, (req, res) => {
    const userId = req.user.id;
    const q = "SELECT name, amount FROM users WHERE id = $1";
    db.get(q, [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        return res.status(200).json(user);
    });
});
app.get("/api/user/purchases", authenticateToken, (req, res) => {
    const userId = req.user.id;
    const query = `
        SELECT p.id, c.name, c.price, p.amount
        FROM purchase p
        JOIN coffee c ON p.coffee_id = c.id
        WHERE p.user_id = ${userId}
    `;
    db.all(query, (err, purchases) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ purchases });
    });
});

app.get("/api/user/:id", (req, res) => {
    const { id } = req.params;

    db.get(
        `SELECT id, name, username FROM users WHERE id = ${id}`,
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            res.json({ user });
        },
    );
});

// Route to create a new coffee item
app.post("/api/coffee", (req, res) => {
    const { name, price, image } = req.body;

    // Validate input
    if (!name || !price) {
        return res.status(400).json({ error: "Name and price are required" });
    }

    // Insert new coffee item into database
    const sql = `INSERT INTO coffee (name, price, image) 
                VALUES (?, ?, ?)`;

    db.run(sql, [name, price, image || null], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Return success with the new coffee ID
        res.status(201).json({
            message: "Coffee created successfully",
            id: this.lastID,
        });
    });
});

app.get("/api/generate-otp/:username", (req, res) => {
    const { username } = req.params;
    const otp = Math.floor(Math.random() * 10000) + "";
    const q = `UPDATE users SET otp = '${otp}' WHERE username = '${username}'`;
    db.run(q, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: "OTP generated" });
    });
});

app.post("/api/reset-pin/:username", limiter, (req, res) => {
    const { username } = req.params;
    const { otp, password } = req.body;
    db.get(`SELECT id FROM users WHERE username = $1 AND otp = $2`, [
        username,
        otp,
    ], (err, user) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!user) {
            res.status(404).json({ error: "Invalid OTP" });
            return;
        }
        const q = `UPDATE users SET password = $1 WHERE username = $2`;
        db.run(q, [password, username], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: "OK" });
        });
    });
});

app.get("/api/users", (req, res) => {
    db.all("SELECT id,name,username FROM users", (err, users) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ users });
    });
});

app.post("/api/purchase", authenticateToken, (req, res) => {
    const user_id = req.user.id;
    const { coffee_id, amount } = req.body;

    // Get coffee price
    db.get(
        `SELECT price FROM coffee WHERE id = ${coffee_id}`,
        (err, coffee) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!coffee) {
                return res.status(404).json({ error: "Coffee not found" });
            }

            // Calculate total cost
            const totalCost = coffee.price * amount;

            // Check user balance
            db.get(
                `SELECT amount FROM users WHERE id = ${user_id}`,
                (err, user) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    if (user.amount < totalCost) {
                        return res.status(400).json({
                            error: "Insufficient balance",
                        });
                    }

                    // Update user balance
                    db.run(
                        `UPDATE users SET amount = amount - ${totalCost} WHERE id = ${user_id}`,
                        function (err) {
                            if (err) {
                                return res.status(500).json({
                                    error: err.message,
                                });
                            }

                            // Create purchase record
                            const insertQuery =
                                `INSERT INTO purchase (user_id, coffee_id, amount) VALUES (${user_id}, ${coffee_id}, ${amount})`;
                            db.run(insertQuery, function (err) {
                                if (err) {
                                    return res.status(500).json({
                                        error: err.message,
                                    });
                                }
                                res.status(201).json({
                                    message: "Purchase successful",
                                    purchase_id: this.lastID,
                                });
                            });
                        },
                    );
                },
            );
        },
    );
});

// 3. Comment on a coffee
app.post("/api/coffee/:id/comment", authenticateToken, (req, res) => {
    const coffee_id = req.params.id;
    const user_id = req.user.id;
    const { content } = req.body;

    const insertQuery =
        `INSERT INTO comments (user_id, coffee_id, content) VALUES ($1, $2, $3)`;
    db.run(insertQuery, [user_id, coffee_id, content], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: "Comment added",
            comment_id: this.lastID,
        });
    });
});

// 4. Transfer credit from one user to another
app.post("/api/transfer", authenticateToken, (req, res) => {
    const sender_id = req.user.id;
    const { receiver_id, amount } = req.body;

    // Check sender's balance
    db.get(
        `SELECT amount FROM users WHERE id = ${sender_id}`,
        (err, sender) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (sender.amount < amount) {
                return res.status(400).json({ error: "Insufficient balance" });
            }

            // Deduct from sender
            db.run(
                `UPDATE users SET amount = amount - ${amount} WHERE id = ${sender_id}`,
                function (err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    // Add to receiver
                    db.run(
                        `UPDATE users SET amount = amount + ${amount} WHERE id = ${receiver_id}`,
                        function (err) {
                            if (err) {
                                return res.status(500).json({
                                    error: err.message,
                                });
                            }
                            res.json({ message: "Transfer successful" });
                        },
                    );
                },
            );
        },
    );
});

// 5. Update user profile
app.post("/api/profile/update", authenticateToken, (req, res) => {
    const user_id = req.user.id;
    const updates = req.body;

    // Build SET clause for SQL query
    const setClause = Object.keys(updates)
        .map((key) => `${key} = '${updates[key]}'`)
        .join(", ");

    if (!setClause) {
        return res.status(400).json({ error: "No fields to update" });
    }

    const updateQuery = `UPDATE users SET ${setClause} WHERE id = ${user_id}`;
    db.run(updateQuery, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Profile updated successfully" });
    });
});

// 6. View all available coffees
app.get("/api/coffees", (req, res) => {
    db.all("SELECT * FROM coffee", (err, coffees) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ coffees });
    });
});

// Get coffee by ID
app.get("/api/coffee/:id", (req, res) => {
    const { id } = req.params;
    db.get(`SELECT * FROM coffee WHERE id = ${id}`, (err, coffee) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!coffee) {
            return res.status(404).json({ error: "Coffee not found" });
        }
        res.json({ coffee });
    });
});

app.get("/api/coffee/:id/comments", (req, res) => {
    const { id } = req.params;
    db.all(
        `SELECT c.*, u.name FROM comments c JOIN users u ON c.user_id = u.id WHERE coffee_id = ${id}`,
        (err, comments) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ comments });
        },
    );
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
