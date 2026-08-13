// URL encode/decode using the real URI encoding primitives the browser
// provides — never a hand-rolled character-replacement table, per the
// explicit requirement. Two distinct modes exist because they answer
// different questions and a single "encode everything" function would get
// one of them wrong:
//
//  - encodeURIComponent: correct for a single query-string VALUE (encodes
//    every reserved character including & = ? # so it can't be mistaken
//    for query-string structure). Space becomes %20.
//  - A "form" variant additionally turns a literal space into "+", matching
//    application/x-www-form-urlencoded (the encoding an HTML <form> or a
//    query string built by hand traditionally uses) — offered as an
//    explicit toggle rather than silently picking one behavior, since
//    "%20 vs +" is a real, user-visible difference for query strings.

export function urlEncode(text, { plusForSpace = false } = {}) {
  const encoded = encodeURIComponent(text);
  return plusForSpace ? encoded.replace(/%20/g, '+') : encoded;
}

export function urlDecode(text, { plusForSpace = false } = {}) {
  const input = plusForSpace ? text.replace(/\+/g, '%20') : text;
  try {
    return { ok: true, text: decodeURIComponent(input) };
  } catch {
    return { ok: false, error: 'This does not look like validly percent-encoded text — check for a stray "%" not followed by two hex digits.' };
  }
}

// Encodes a full URL rather than a single component — encodeURI leaves
// structural characters (: / ? # [ ] @ & = + $ , ;) untouched since they're
// meaningful in a URL, only encoding characters that are never valid
// unescaped anywhere in a URL (spaces, most Unicode, etc).
export function encodeFullUrl(text) {
  return encodeURI(text);
}

export function decodeFullUrl(text) {
  try {
    return { ok: true, text: decodeURI(text) };
  } catch {
    return { ok: false, error: 'This does not look like a validly encoded URL.' };
  }
}
