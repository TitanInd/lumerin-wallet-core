const removePrivateKeyPrefix = privateKey => privateKey.slice(2);

// https://superuser.com/a/1465498
const add65BytesPrefix = key => `04${key}`;

module.exports = {
    removePrivateKeyPrefix,
    add65BytesPrefix,
}