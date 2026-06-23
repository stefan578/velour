require("dotenv").config();

const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({

    service: "gmail",

    auth: {

        user: process.env.EMAIL_USER,

        pass: process.env.EMAIL_PASS

    }

});

app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("./database/velour.db");

// ================= LOGIN =================

app.post("/api/login", (req, res) => {

    const { username, password } = req.body;

    if (

        username === process.env.ADMIN_USER &&

        password === process.env.ADMIN_PASS

    ) {

        const token = jwt.sign(

            {

                username

            },

            process.env.JWT_SECRET,

            {

                expiresIn: "7d"

            }

        );

        return res.json({

            success: true,

            token

        });

    }

    res.status(401).json({

        success: false,

        message: "Pogresan login"

    });

});


// ================= JWT =================

function verifyToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {

        return res.status(401).json({

            error: "Nema tokena"

        });

    }

    const token = authHeader.split(" ")[1];

    try {

        jwt.verify(

            token,

            process.env.JWT_SECRET

        );

        next();

    }

    catch {

        res.status(401).json({

            error: "Neispravan token"

        });

    }

}


// ================= CREATE =================

app.post("/api/reservations", (req, res) => {

    console.log("NOVA REZERVACIJA:");

    console.log(req.body);

    const {

        villaName,

        firstName,

        lastName,

        email,

        phone,

        reservationDate,

        reservationTime,

        guests,

        occasion,

        notes

    } = req.body;

    if (

        !firstName ||

        !lastName ||

        !email ||

        !reservationDate ||

        !reservationTime

    ) {

        return res.status(400).json({

            success: false,

            message:

            "Sva obavezna polja moraju biti popunjena"

        });

    }

    db.run(

        `

        INSERT INTO reservations

        (

            villaName,

            firstName,

            lastName,

            email,

            phone,

            reservationDate,

            reservationTime,

            guests,

            occasion,

            notes,

            status

        )

        VALUES (?,?,?,?,?,?,?,?,?,?,?)

        `,

        [

            villaName,

            firstName,

            lastName,

            email,

            phone,

            reservationDate,

            reservationTime,

            guests,

            occasion,

            notes,

            "Pending"

        ],

        function(err){

            if(err){

                return res

                .status(500)

                .json(err);

            }

            res.json({

                success:true,

                id:this.lastID

            });

        }

    );

});


// ================= GET ALL =================

app.get(

    "/api/reservations",

    verifyToken,

    (req,res)=>{

        db.all(

            `

            SELECT *

            FROM reservations

            ORDER BY createdAt DESC

            `,

            [],

            (err,rows)=>{

                if(err){

                    return res

                    .status(500)

                    .json(err);

                }

                res.json(rows);

            }

        );

    }

);


// ================= SEARCH =================

app.get(

    "/api/search",

    verifyToken,

    (req,res)=>{

        const q = req.query.q;

        db.all(

            `

            SELECT *

            FROM reservations

            WHERE

            id = ?

            OR

            firstName LIKE ?

            OR

            lastName LIKE ?

            OR

            email LIKE ?

            ORDER BY createdAt DESC

            `,

            [

                q,

                `%${q}%`,

                `%${q}%`,

                `%${q}%`

            ],

            (err,rows)=>{

                if(err){

                    return res

                    .status(500)

                    .json(err);

                }

                res.json(rows);

            }

        );

    }

);


// ================= CONFIRM =================

app.put(

    "/api/reservations/:id/confirm",

    verifyToken,

    (req,res)=>{

        db.run(

            `

            UPDATE reservations

            SET status='Confirmed'

            WHERE id=?

            `,

            [

                req.params.id

            ],

            function(err){

                if(err){

                    return res

                    .status(500)

                    .json(err);

                }

                res.json({

                    success:true

                });

            }

        );

    }

);


// ================= REJECT =================

app.put(

    "/api/reservations/:id/reject",

    verifyToken,

    (req,res)=>{

        db.run(

            `

            UPDATE reservations

            SET status='Rejected'

            WHERE id=?

            `,

            [

                req.params.id

            ],

            function(err){

                if(err){

                    return res

                    .status(500)

                    .json(err);

                }

                res.json({

                    success:true

                });

            }

        );

    }

);


// ================= DELETE =================

app.delete(

    "/api/reservations/:id",

    verifyToken,

    (req,res)=>{

        db.run(

            "DELETE FROM reservations WHERE id=?",

            [

                req.params.id

            ],

            function(err){

                if(err){

                    return res

                    .status(500)

                    .json(err);

                }

                res.json({

                    success:true

                });

            }

        );

    }

);

app.post("/api/reservations/:id/confirm", async (req, res) => {
  const id = req.params.id;

  
  db.run(

    "UPDATE reservations SET status='Confirmed' WHERE id=?",

    [id],

    function(err){

      if(err){

        return res.status(500).json(err);

      }


    }

  );



  db.get(
    "SELECT * FROM reservations WHERE id = ?",
    [id],
    async (err, row) => {

      if (err) {
        return res.status(500).json(err);
      }

      if (!row) {
        return res.status(404).json({
          success:false,
          message:"Rezervacija ne postoji"
        });
      }

      try {

        // promeni status
        db.run(
          "UPDATE reservations SET status = 'confirmed' WHERE id = ?",
          [id]
        );

        // posalji email
await transporter.sendMail({

  from: process.env.EMAIL_USER,

  to: row.email,

  subject: "✔ Potvrda rezervacije - Velour",

  html: row.villaName

  ? `

    <h2>Vaša rezervacija vile je potvrđena</h2>

    <p><b>Vila:</b> ${row.villaName}</p>

    <p><b>Dolazak:</b> ${row.reservationDate}</p>

    <p><b>Odlazak:</b> ${row.reservationTime}</p>

    <p><b>Broj gostiju:</b> ${row.guests}</p>

    <br>

    <p>Hvala što koristite Velour.</p>

  `

  : `

    <h2>Vaša rezervacija restorana je potvrđena</h2>

    <p><b>Velour Fine Dining</b></p>

    <p><b>Datum:</b> ${row.reservationDate}</p>

    <p><b>Vreme:</b> ${row.reservationTime}</p>

    <p><b>Broj gostiju:</b> ${row.guests}</p>

    <br>

    <p>Hvala što koristite Velour.</p>

  `

});

        res.json({
          success:true,
          message:"Rezervacija potvrđena i email poslat"
        });

      } catch(e) {

        console.log("EMAIL ERROR:",e);

        res.status(500).json({
          success:false,
          message:"Greška pri slanju emaila"
        });

      }

    }
  );
});

app.put("/api/reservations/:id/reject", async (req,res)=>{
  const id=req.params.id;
  
  db.run(
    "UPDATE reservations SET status='Rejected' WHERE id=?",
    [id],
    function(err){
      if(err){
        return res.status(500).json({success:false,error:err});
      }
      res.json({success:true,message:"Rezervacija odbijena"});
    }
  );
});

// ================= STATS =================

app.get(

    "/api/stats",

    verifyToken,

    (req,res)=>{

        db.get(

            `

            SELECT

            COUNT(*) as total,

            SUM(

            CASE

            WHEN

            reservationDate = date('now')

            THEN 1

            ELSE 0

            END

            ) as today,

            SUM(

            CASE

            WHEN

            status='Pending'

            THEN 1

            ELSE 0

            END

            ) as pending

            FROM reservations

            `,

            [],

            (err,row)=>{

                if(err){

                    return res

                    .status(500)

                    .json(err);

                }

                res.json({

                    total:

                    row.total || 0,

                    today:

                    row.today || 0,

                    pending:

                    row.pending || 0

                });

            }

        );

    }

);


// ================= AUTO DELETE =================

setInterval(()=>{

    db.run(

        `

        DELETE FROM reservations

        WHERE

        date(reservationDate)

        <=

        date('now','-7 day')

        `,

        [],

        (err)=>{

            if(err){

                console.log(err);

            }

        }

    );

},86400000);


// ================= SERVER =================

app.listen(

    3000,

    ()=>{

        console.log(

        "Server radi na http://localhost:3000"

        );

    }

);