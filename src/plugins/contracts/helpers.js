//@ts-check

const remove0xPrefix = privateKey => privateKey.replace('0x', '');

// https://superuser.com/a/1465498
/** @param {string} key */
const add65BytesPrefix = key => {
    key = key.replace("0x", "")

    // 64 bytes hex string (2 char per byte)
    if (key.length === 64 * 2) {
        return `04${key}`
    }

    return key
}

module.exports = {
    remove0xPrefix,
    add65BytesPrefix,
}