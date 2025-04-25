import express from "express";
import pg from "pg";

const app = express();
const port = process.env.PORT || 3000;
const db = new pg.Client({
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function renderCurrentVisited(error) {
  const visited = await getUserVisited(currentUserId);
  const { rows: users } = await db.query("SELECT * FROM users;")
  let data = {
    countries: visited,
    total: visited.length,
    users: users,
    color: users.filter(usr => usr.id === currentUserId)[0].color
  };
  if (error) { data = {...data, ...error} }; 
  this.render("index.ejs", data);
}

async function getUserVisited(user_id) {
  /* Gets an array of visited countries for the input user-ID  */
  const result = await db.query(`SELECT country_code FROM visited_countries AS vc JOIN users tu ON tu.id = vc.user_id WHERE user_id=$1;`, [user_id]);
  // `result.rows` doesn't return [] when empty, so:
  return (result.rowCount == 0) ? [] : result.rows.map(row => row.country_code);
}

let currentUserId = 1;

db.connect();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use((req, res, next) => {
  res.renderCurrentVisited = renderCurrentVisited;
  next();
});


app.get("/", async (req, res) => {
  res.renderCurrentVisited();
});

app.post("/add", async (req, res) => {
  /* Attempt to add a country to user's visited countries */
  const input = req.body.country;

  try { // Look for countries in `countries` that match the user's input.
    const result = await db.query("SELECT country_name, country_code FROM countries WHERE LOWER(country_name) LIKE CONCAT('%', LOWER($1), '%');", [input.trim()]);
    if (result.rowCount > 1) { // Handle when multiple results are returned.
      res.renderCurrentVisited({ error: `'${input}' returned too many (${result.rowCount}) matches.` });
      return;
    };

    try { // Add user's `input` and `id` to `visited_countries`.
      const { country_code: countryCode } = result.rows[0];
      await db.query("INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2);", [countryCode, currentUserId]); //* db has constraint that pair must be unique.
      console.log(`'${countryCode}' has been added to user with ID: ${currentUserId}`);
      res.redirect("/");
    } catch (err) { // Catch case where input is a duplicate.
      const { country_name: name } = result.rows[0];
      console.error(`'${name}' is a duplicate for user with ID: ${currentUserId}`);
      res.renderCurrentVisited({ error: `'${name}' has already been registered for this user.` });
    }

  } catch (err) { // Catch case where country can't be found in `countries`.
    console.log(err);
    res.renderCurrentVisited({ error: `'${input}' was not recognised as a country.` })
  }
});

app.post("/user", async (req, res) => {
  /* Retrieve specific user data */
  if (req.body.add) {
    console.log("Rendering 'new' user page.");
    res.render("new.ejs");
  } else {
    const newUser = parseInt(req.body.name);
    console.log(`Switching user from '${currentUserId}' to '${newUser}'.`);
    currentUserId = newUser;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  /* Add a new user */
  const { name, color } = req.body
  try { // Adding new user from form.
    const result = await db.query("INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id", [name, color]);
    const { id } = result.rows[0];
    console.log(`Added user '${name}', ID: '${id}'`);
    currentUserId = id
    res.redirect("/");
  } catch (err) { // Username already exists.
    console.error(err);
    res.render("new.ejs", { error: `'${name}' is already a user`});
  };
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
