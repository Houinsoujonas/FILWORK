/**
 * Retourne la liste des champs d'un corps JSON qui ne font pas partie des
 * champs autorisés.
 *
 * @param {unknown} body
 * @param {readonly string[]} allowedFields
 * @returns {string[]}
 */
function findUnknownFields(body, allowedFields) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return [];
  }

  return Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  );
}

module.exports = {
  findUnknownFields,
};
