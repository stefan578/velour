const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database/velour.db");

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT,
            lastName TEXT,
            email TEXT,
            phone TEXT,
            reservationDate TEXT,
            reservationTime TEXT,
            guests TEXT,
            occasion TEXT,
            notes TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS villa_inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            villaName TEXT,
            firstName TEXT,
            lastName TEXT,
            email TEXT,
            phone TEXT,
            checkin TEXT,
            checkout TEXT,
            guests TEXT,
            notes TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

});

console.log("Baza kreirana");
db.close();