function formatTimePeriod(dateString, fallbackDate) {
    if (!dateString && !fallbackDate) return '-- -- ----';
    const date = new Date(dateString || fallbackDate);

    if (isNaN(date.getTime())) return dateString || '-- -- ----';

    const now = new Date();

    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const safeDiffDays = Math.max(diffDays, 0);

    if (safeDiffDays === 0) {
        return `Today at ${time}`;
    } else if (safeDiffDays === 1) {
        return `Yesterday at ${time}`;
    } else if (safeDiffDays < 7) {
        return `${safeDiffDays} days ago at ${time}`;
    } else {
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * This function capitalize first letter of word
 * @param {*} str parsing word
 * @returns string capitalized str 
 */
function capitalize(str) {
    if (typeof str !== 'string' || str.length === 0) {
        return '';
    }

    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * This function capitalize first letter of each word in a string
 * @param {*} str parsing phrase
 * @returns str Title cased string/phrase
 */
function titleCase(str) {
    var splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
    }

    return splitStr.join(' ');
}

/**
 * This function return the passed string text with limit to the specified length
 * @param {*} str 
 * @param {*} limit Maximum character to end text to
 * @returns Limited string text
 */
function truncateText(str = '', limit = 10) {
    if (str.length <= limit) {
        return str;
    }
    // .trim()/.rstrip() avoid a space before the ellipsis
    return str.slice(0, limit).trimEnd() + "...";
}

function formatDate(dateStr) {

    const options = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const date = new Date(dateStr);

    return date.toLocaleString('en-GB', options);
}

function formatDateOnly(dateStr) {

    const options = {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };
    const date = new Date(dateStr);

    return date.toLocaleString('en-GB', options);
}

/**
 * Replace html tags but does not replace html tags with space character
 * @param {*} htmlString 
 * @returns Html tags free plain text
 */
function stripHtml(htmlString) {
    return htmlString.replace(/<\/?[^>]+(>|$)/g, "");
}

/**
 * Replace html tags with space character
 * @param {*} htmlString 
 * @returns Html tags free plain text
 */
function stripHtml2(htmlString) {
    if (!htmlString) return '';
    return htmlString
        .replace(/<\/?(li|div)[^>]*>/gi, " ")
        .replace(/<\/?[^>]+(>|$)/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Compare two object to get the unequal values as object
 * @param {object} original 
 * @param {object} updated 
 * @returns {object} Returns object with distinct values
 */
function getChangedAttributes(original, updated) {
    const changed = {};
    const allKeys = new Set([...Object.keys(original), ...Object.keys(updated)]);
    for (const key of allKeys) {
        const origValue = original[key];
        const newValue = updated[key];
        if (newValue === undefined) continue;
        const isDeepEqual = JSON.stringify(origValue) === JSON.stringify(newValue);
        if (!isDeepEqual) {
            changed[key] = newValue;
        }
    }
    return changed;
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}