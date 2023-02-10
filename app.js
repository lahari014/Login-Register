const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const app = express();
app.use(express.json());
let db = null;
const initializeDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};
initializeDb();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//API 1
app.get("/states/", async (request, response) => {
  const query = `SELECT * FROM state`;
  const data = await db.all(query);
  let list = [];
  for (let i of data) {
    list.push({
      stateId: i.state_id,
      stateName: i.state_name,
      population: i.population,
    });
  }
  response.send(list);
});

//API 2
app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const query = `SELECT * FROM state WHERE state_id=${stateId}`;
  const i = await db.get(query);
  const data = {
    stateId: i.state_id,
    stateName: i.state_name,
    population: i.population,
  };
  response.send(data);
});

//API 3
app.post("/districts/", async (request, response) => {
  const details = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = details;
  const query = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths) 
    VALUES('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}')`;
  await db.run(query);
  response.send("District Successfully Added");
});

//API 4
app.get("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const query = `SELECT * FROM district WHERE district_id=${districtId}`;
  const i = await db.get(query);
  const list = {
    districtId: i.district_id,
    districtName: i.district_name,
    stateId: i.state_id,
    cases: i.cases,
    cured: i.cured,
    active: i.active,
    deaths: i.deaths,
  };
  response.send(list);
});

//API 5
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const query = `DELETE FROM district WHERE district_id=${districtId}`;
  await db.run(query);
  response.send("District Removed");
});

//API 6
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const details = request.body;
  const { districtName, stateId, cured, cases, active, deaths } = details;
  const query = `UPDATE district SET
  district_name='${districtName}',
  state_id= '${stateId}',
  cases= '${cases}',
  cured= '${cured}',
  active= '${active}',
  deaths= '${deaths}'  
  WHERE district_id=${districtId}`;
  await db.run(query);
  response.send("District Details Updated");
});

//API 7
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const query = `
    SELECT
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM district 
    WHERE state_id=${stateId}`;
  const data = await db.get(query);
  response.send({
    totalCases: data["SUM(cases)"],
    totalCured: data[" SUM(cured)"],
    totalActive: data["SUM(active)"],
    totalDeaths: data["SUM(deaths)"],
  });
});

//API 8
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const query = `
    SELECT state_id
    FROM district
    WHERE district_id=${districtId}`;
  const data = await db.get(query);
  const stateId = data.state_id;
  const query1 = `
  SELECT state_name AS stateName
  FROM state WHERE state_id=${stateId}`;
  const data1 = await db.get(query1);
  response.send(data1);
});

//API 9
app.post("/login/", authenticateToken, async (request, response) => {
  const { username, password } = request.body;
  const q1 = `SELECT * FROM user WHERE username='${username}`;
  const d1 = await db.get(q1);
  if (d1 == undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const q2 = await bcrypt.compare(password, d1.password);
    if (q2 == false) {
      response.status(400);
      response.send("Invalid Password");
    } else {
      response.send("success");
    }
  }
});

module.exports = app;
