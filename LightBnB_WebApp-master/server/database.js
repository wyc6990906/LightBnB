const properties = require("./json/properties.json");
const users = require("./json/users.json");

const pg = require('pg')
const config = {
  user: 'yichuanwang',
  host: 'localhost',
  database: 'lightbnb'
};
const client = new pg.Client(config)
client.connect()
// client.query(`SELECT * FROM users ORDER BY id DESC LIMIT 10 ;`).then(response => {
//   console.log(response)
// })

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return client.query(`SELECT *
                       FROM users
                       where email = $1`, [email])
    .then((result) => {
      // console.log(result.rows);
      if (result.rows) {
        return result.rows[0]
      } else {
        return null
      }
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return client.query(`SELECT *
                       FROM users
                       where id = $1`, [id])
    .then((result) => {
      // console.log(result.rows);
      if (result.rows) {
        return result.rows[0]
      } else {
        return null
      }
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const userValue = [user.name, user.email, user.password]
  return client.query(`
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3) RETURNING *;
  `, userValue).then(result => {
    if (result.rows) {
      console.log(result.rows)
      return result.rows[0]
    } else {
      return null
    }
  })
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const values = [guest_id, limit];
  const queryString = `
      SELECT properties.*, reservations.*, AVG(rating) as average_rating
      FROM reservations
               JOIN properties ON reservations.property_id = properties.id
               JOIN property_reviews ON properties.id = property_reviews.property_id
      WHERE reservations.guest_id = $1
        AND reservations.start_date > now()::date
      GROUP BY properties.id, reservations.id
      ORDER BY reservations.start_date
      LIMIT $2;
  `;
  return client.query(queryString, values)
    .then(res => res.rows);
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  const queryParams = [];
  let queryString = `
      SELECT properties.*, avg(property_reviews.rating) as average_rating
      FROM properties
               JOIN property_reviews ON properties.id = property_id
      WHERE TRUE
  `;
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `AND city LIKE $${queryParams.length} `;
  }


  if (options.minimum_price_per_night) {
    queryParams.push(Number(options.minimum_price_per_night));
    queryString += `AND cost_per_night >= $${queryParams.length} `;
  }

  if (options.maximum_price_per_night) {
    queryParams.push(Number(options.maximum_price_per_night));
    queryString += `AND cost_per_night <= $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(Number(options.owner_id));
    queryString += `AND owner_id = $${queryParams.length} `;
  }

  queryString += `
  GROUP BY properties.id
  `;

  if (options.minimum_rating) {
    queryParams.push(Number(options.minimum_rating));
    queryString += `HAVING AVG(property_reviews.rating) >= $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // console.log(queryString, queryParams);

  return client.query(queryString, queryParams)
    .then(res => res.rows);


}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  if (property.description === undefined) property.description = '';
  const values = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
    property.country,
    property.street,
    property.city,
    property.province,
    property.post_code
  ];
  const queryString = `
      INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night,
                              parking_spaces, number_of_bathrooms, number_of_bedrooms, country, street, city, province,
                              post_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *;
  `;
  return client.query(queryString, values)
    .then(res => {
      if (res.rows) return res.rows[0];
      else return null;
    });
}
exports.addProperty = addProperty;
