// Movie! Plus - GrayJay source
// Backend: https://appsdevxp.com / https://github.com/dev-mplus01/mplus01T
// Cifrado de URLs: AES-256-ECB (clave embebida en la app, libmovp_.so)

const PLATFORM = "MoviePlus";
const PLATFORM_URL = "https://appsdevxp.com";

const TMDB_API_KEY = "ec4ff1b6182572d3e74735e74ca3a8ef";
const AES_KEY_TEXT = "android_idfkvn8 w4y*(NC$G*(G($*G";
// Clave binaria AES-256-GCM embebida en libmovp_.so (token nuevo "Movp!::")
const GCM_KEY_HEX = "474068664d745e6573655e796d436e785c59695b5d6d627459747f69512e2b08";
const GCM_PREFIX = "Movp!::";

const CATALOG_URLS = [
	"https://www.appsdevx.com/app/db/getlistFile.json",
	"https://api.appsdevxp.com/db/getlistFile.json",
	"https://raw.githubusercontent.com/dev-mplus01/mplus01T/main/db/getlistFile.json",
	"https://developerxploit.com/app/db/getlistFile.json"
];

const FULL_CATALOG_URLS = [
	"https://api.appsdevxp.com/db/items_up.json.gz",
	"https://raw.githubusercontent.com/dev-mplus01/mplus01T/main/db/items_up.json.gz",
	"https://developerxploit.com/app/db/items_up.json.gz"
];

// ---------------------------------------------------------------
// Base64 + AES-256-ECB (puro JS, sin dependencias)
// ---------------------------------------------------------------
const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function b64ToBytes(b64) {
	b64 = b64.replace(/[\r\n\t ]/g, "");
	const out = [];
	let buffer = 0, bits = 0;
	for (let i = 0; i < b64.length; i++) {
		const ch = b64[i];
		if (ch === "=") break;
		const v = B64_CHARS.indexOf(ch);
		if (v < 0) continue;
		buffer = (buffer << 6) | v;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			out.push((buffer >> bits) & 0xff);
		}
	}
	return out;
}
function aesXtime(a) {
	a <<= 1;
	if (a & 0x100) a ^= 0x11b;
	return a & 0xff;
}
function aesGmul(a, b) {
	let r = 0;
	while (b > 0) {
		if (b & 1) r ^= a;
		b >>= 1;
		a = aesXtime(a);
	}
	return r & 0xff;
}
const AES_SBOX = [
	0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
	0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
	0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
	0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
	0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
	0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
	0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
	0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
	0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
	0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
	0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
	0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
	0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
	0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
	0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
	0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
];
const AES_RSBOX = [
	0x52,0x09,0x6a,0xd5,0x30,0x36,0xa5,0x38,0xbf,0x40,0xa3,0x9e,0x81,0xf3,0xd7,0xfb,
	0x7c,0xe3,0x39,0x82,0x9b,0x2f,0xff,0x87,0x34,0x8e,0x43,0x44,0xc4,0xde,0xe9,0xcb,
	0x54,0x7b,0x94,0x32,0xa6,0xc2,0x23,0x3d,0xee,0x4c,0x95,0x0b,0x42,0xfa,0xc3,0x4e,
	0x08,0x2e,0xa1,0x66,0x28,0xd9,0x24,0xb2,0x76,0x5b,0xa2,0x49,0x6d,0x8b,0xd1,0x25,
	0x72,0xf8,0xf6,0x64,0x86,0x68,0x98,0x16,0xd4,0xa4,0x5c,0xcc,0x5d,0x65,0xb6,0x92,
	0x6c,0x70,0x48,0x50,0xfd,0xed,0xb9,0xda,0x5e,0x15,0x46,0x57,0xa7,0x8d,0x9d,0x84,
	0x90,0xd8,0xab,0x00,0x8c,0xbc,0xd3,0x0a,0xf7,0xe4,0x58,0x05,0xb8,0xb3,0x45,0x06,
	0xd0,0x2c,0x1e,0x8f,0xca,0x3f,0x0f,0x02,0xc1,0xaf,0xbd,0x03,0x01,0x13,0x8a,0x6b,
	0x3a,0x91,0x11,0x41,0x4f,0x67,0xdc,0xea,0x97,0xf2,0xcf,0xce,0xf0,0xb4,0xe6,0x73,
	0x96,0xac,0x74,0x22,0xe7,0xad,0x35,0x85,0xe2,0xf9,0x37,0xe8,0x1c,0x75,0xdf,0x6e,
	0x47,0xf1,0x1a,0x71,0x1d,0x29,0xc5,0x89,0x6f,0xb7,0x62,0x0e,0xaa,0x18,0xbe,0x1b,
	0xfc,0x56,0x3e,0x4b,0xc6,0xd2,0x79,0x20,0x9a,0xdb,0xc0,0xfe,0x78,0xcd,0x5a,0xf4,
	0x1f,0xdd,0xa8,0x33,0x88,0x07,0xc7,0x31,0xb1,0x12,0x10,0x59,0x27,0x80,0xec,0x5f,
	0x60,0x51,0x7f,0xa9,0x19,0xb5,0x4a,0x0d,0x2d,0xe5,0x7a,0x9f,0x93,0xc9,0x9c,0xef,
	0xa0,0xe0,0x3b,0x4d,0xae,0x2a,0xf5,0xb0,0xc8,0xeb,0xbb,0x3c,0x83,0x53,0x99,0x61,
	0x17,0x2b,0x04,0x7e,0xba,0x77,0xd6,0x26,0xe1,0x69,0x14,0x63,0x55,0x21,0x0c,0x7d
];
function aesExpandKey(keyBytes) {
	const Nk = 8, Nr = 14, Nb = 4;
	const w = [];
	for (let i = 0; i < Nk; i++) w.push([keyBytes[4*i], keyBytes[4*i+1], keyBytes[4*i+2], keyBytes[4*i+3]]);
	let rcon = 1;
	for (let i = Nk; i < Nb*(Nr+1); i++) {
		let t = w[i-1].slice();
		if (i % Nk === 0) {
			t = [AES_SBOX[t[1]], AES_SBOX[t[2]], AES_SBOX[t[3]], AES_SBOX[t[0]]];
			t[0] ^= rcon;
			rcon = aesXtime(rcon);
		} else if (Nk > 6 && i % Nk === 4) {
			t = [AES_SBOX[t[0]], AES_SBOX[t[1]], AES_SBOX[t[2]], AES_SBOX[t[3]]];
		}
		w.push([
			w[i-Nk][0]^t[0], w[i-Nk][1]^t[1], w[i-Nk][2]^t[2], w[i-Nk][3]^t[3]
		]);
	}
	return w;
}
function aesAddRoundKey(state, w, round) {
	for (let c = 0; c < 4; c++) {
		const k = w[4*round + c];
		for (let r = 0; r < 4; r++) state[4*c + r] ^= k[r];
	}
}
function aesInvShiftRows(state) {
	const t = new Array(16);
	for (let r = 1; r < 4; r++)
		for (let c = 0; c < 4; c++)
			t[4*c + r] = state[4*((c + 4 - r) % 4) + r];
	for (let c = 0; c < 4; c++)
		for (let r = 1; r < 4; r++)
			state[4*c + r] = t[4*c + r];
}
function aesInvMixColumns(state) {
	for (let c = 0; c < 4; c++) {
		const a = [state[4*c], state[4*c+1], state[4*c+2], state[4*c+3]];
		state[4*c]   = aesGmul(a[0],14)^aesGmul(a[1],11)^aesGmul(a[2],13)^aesGmul(a[3],9);
		state[4*c+1] = aesGmul(a[0],9)^aesGmul(a[1],14)^aesGmul(a[2],11)^aesGmul(a[3],13);
		state[4*c+2] = aesGmul(a[0],13)^aesGmul(a[1],9)^aesGmul(a[2],14)^aesGmul(a[3],11);
		state[4*c+3] = aesGmul(a[0],11)^aesGmul(a[1],13)^aesGmul(a[2],9)^aesGmul(a[3],14);
	}
}
function aesEcbDecryptBlock(words, block) {
	const state = block.slice();
	aesAddRoundKey(state, words, 14);
	for (let round = 13; round >= 1; round--) {
		aesInvShiftRows(state);
		for (let i = 0; i < 16; i++) state[i] = AES_RSBOX[state[i]];
		aesAddRoundKey(state, words, round);
		aesInvMixColumns(state);
	}
	aesInvShiftRows(state);
	for (let i = 0; i < 16; i++) state[i] = AES_RSBOX[state[i]];
	aesAddRoundKey(state, words, 0);
	return state;
}
function aesEcbDecrypt(keyBytes, data) {
	if (data.length === 0 || data.length % 16 !== 0) throw new ScriptException("AES: longitud inválida");
	const words = aesExpandKey(keyBytes);
	const out = [];
	for (let off = 0; off < data.length; off += 16) {
		const blk = aesEcbDecryptBlock(words, data.slice(off, off + 16));
		for (let i = 0; i < 16; i++) out.push(blk[i]);
	}
	return out;
}
function pkcs7Unpad(bytes) {
	if (bytes.length === 0) return bytes;
	const pad = bytes[bytes.length - 1];
	if (pad >= 1 && pad <= 16 && pad <= bytes.length) {
		let ok = true;
		for (let i = 0; i < pad; i++)
			if (bytes[bytes.length - 1 - i] !== pad) { ok = false; break; }
		if (ok) return bytes.slice(0, bytes.length - pad);
	}
	return bytes;
}
function bytesToText(bytes) {
	let s = "";
	for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
	return s;
}
function bytesToBytes(text) {
	const b = [];
	for (let i = 0; i < text.length; i++) b.push(text.charCodeAt(i) & 0xff);
	return b;
}
function hexToBytes(hex) {
	const b = [];
	for (let i = 0; i < hex.length; i += 2)
		b.push(parseInt(hex.substring(i, i + 2), 16));
	return b;
}

// ---------------------------------------------------------------
// AES-256-GCM (nuevo backend "Movp!::"; clave binaria de libmovp_.so)
// ---------------------------------------------------------------
function aesShiftRows(state) {
	const t = state.slice();
	for (let c = 0; c < 4; c++)
		for (let r = 1; r < 4; r++)
			state[4*c + r] = t[4*((c + r) % 4) + r];
}
function aesMixColumns(state) {
	for (let c = 0; c < 4; c++) {
		const a = [state[4*c], state[4*c+1], state[4*c+2], state[4*c+3]];
		state[4*c]   = aesGmul(a[0],2)^aesGmul(a[1],3)^a[2]^a[3];
		state[4*c+1] = a[0]^aesGmul(a[1],2)^aesGmul(a[2],3)^a[3];
		state[4*c+2] = a[0]^a[1]^aesGmul(a[2],2)^aesGmul(a[3],3);
		state[4*c+3] = aesGmul(a[0],3)^a[1]^a[2]^aesGmul(a[3],2);
	}
}
function aesEcbEncryptBlock(words, block) {
	const state = block.slice();
	aesAddRoundKey(state, words, 0);
	for (let round = 1; round < 14; round++) {
		for (let i = 0; i < 16; i++) state[i] = AES_SBOX[state[i]];
		aesShiftRows(state);
		aesMixColumns(state);
		aesAddRoundKey(state, words, round);
	}
	for (let i = 0; i < 16; i++) state[i] = AES_SBOX[state[i]];
	aesShiftRows(state);
	aesAddRoundKey(state, words, 14);
	return state;
}
function gcmInc32(bytes) {
	const b = bytes.slice();
	for (let i = 15; i >= 12; i--) {
		b[i] = (b[i] + 1) & 0xff;
		if (b[i] !== 0) break;
	}
	return b;
}
function gf128Mul(x, y) {
	const z = new Array(16).fill(0);
	const v = y.slice();
	for (let i = 0; i < 128; i++) {
		if ((x[i >> 3] >> (7 - (i & 7))) & 1)
			for (let j = 0; j < 16; j++) z[j] ^= v[j];
		const carry = v[15] & 1;
		for (let j = 15; j >= 1; j--)
			v[j] = (v[j] >> 1) | ((v[j - 1] & 1) << 7);
		v[0] = v[0] >> 1;
		if (carry) v[0] ^= 0xe1;
	}
	return z;
}
function gcmDecrypt(bytes) {
	if (bytes.length < 28) return "";
	const key = hexToBytes(GCM_KEY_HEX);
	const words = aesExpandKey(key);
	const iv = bytes.slice(0, 12);
	const ctLen = bytes.length - 28;
	const ct = bytes.slice(12, 12 + ctLen);
	const tag = bytes.slice(12 + ctLen);

	const h = aesEcbEncryptBlock(words, new Array(16).fill(0));
	const j0 = iv.concat([0, 0, 0, 1]);

	// GCTR: E(K, inc32(J0)) por bloque
	const mask = [];
	let counter = j0;
	for (let off = 0; off < ct.length; off += 16) {
		counter = gcmInc32(counter);
		mask.push.apply(mask, aesEcbEncryptBlock(words, counter));
	}
	const pt = new Array(ct.length);
	for (let i = 0; i < ct.length; i++) pt[i] = ct[i] ^ mask[i];

	// GHASH sobre ct (padded) + bloque de longitudes
	const blocks = [];
	for (let off = 0; off < ct.length; off += 16) {
		const blk = new Array(16).fill(0);
		for (let i = 0; i < 16 && off + i < ct.length; i++) blk[i] = ct[off + i];
		blocks.push(blk);
	}
	const lenBlk = new Array(16).fill(0);
	const bits = ct.length * 8;
	lenBlk[12] = (bits >> 24) & 0xff;
	lenBlk[13] = (bits >> 16) & 0xff;
	lenBlk[14] = (bits >> 8) & 0xff;
	lenBlk[15] = bits & 0xff;
	blocks.push(lenBlk);

	let y = new Array(16).fill(0);
	for (let i = 0; i < blocks.length; i++) {
		const x = new Array(16);
		for (let j = 0; j < 16; j++) x[j] = y[j] ^ blocks[i][j];
		y = gf128Mul(x, h);
	}
	const eJ0 = aesEcbEncryptBlock(words, j0);
	for (let i = 0; i < 16; i++)
		if ((y[i] ^ eJ0[i]) !== tag[i]) return "";
	return bytesToText(pt).replace(/[\r\n]+/g, "").trim();
}
function decryptToken(token) {
	if (!token) return "";
	try {
		if (token.indexOf(GCM_PREFIX) === 0) {
			const out = gcmDecrypt(b64ToBytes(token.substring(GCM_PREFIX.length)));
			return out || "";
		}
		const bytes = b64ToBytes(token);
		let data = aesEcbDecrypt(bytesToBytes(AES_KEY_TEXT), bytes);
		data = pkcs7Unpad(data);
		return bytesToText(data).replace(/[\r\n]+/g, "").trim();
	} catch (e) {
		return "";
	}
}

// ---------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------
var config = {};
var _settings = {};
var _catalog = null;
var _fullCatalog = null;

function httpGetJson(url) {
	const res = http.GET(url, {});
	if (!res.isOk)
		throw new ScriptException("HTTP " + res.status + " en " + url);
	return JSON.parse(res.body);
}
function normalizeItem(raw) {
	const isSeries = (String(raw.TYPE || raw.type) === "2");
	let id = raw.ID_TMD != null ? String(raw.ID_TMD)
		: (raw.id != null ? String(raw.id) : "");
	if (!id) id = "x" + Math.abs(hashCode(raw.NAME_TMD || raw.nameFile || "")) + "_" + rawTypeSuffix(isSeries);
	const genres = Array.isArray(raw.GENERO || raw.generos)
		? (raw.GENERO || raw.generos).join(", ")
		: (raw.GENERO || raw.generos || "");
	return {
		id: id,
		type: isSeries ? "series" : "movie",
		name: raw.NAME_TMD || raw.nameFile || "",
		othersNames: raw.NAME_ORIGINAL || raw.othersNames || "",
		genres: genres,
		urlImage: raw.URL_IMAGE || raw.urlImage || "",
		date: raw.FIRST_AIR_DATE || raw.RELEASE_DATE || raw.date || "",
		vote: raw.VOTE_AVERAGE || 0,
		folderToken: raw.URL_FOLDER || "",
		// FIX: el backend real no envía "URL_VIDEO", el token de reproducción
		// viene en "URL_FOLDER" (confirmado contra getlistFile.json en vivo).
		videoToken: raw.URL_VIDEO || raw.URL_FOLDER || "",
		urls: raw.urls || []
	};
}
function hashCode(s) {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
	return h;
}
function rawTypeSuffix(isSeries) { return isSeries ? "s" : "m"; }
function loadCatalog() {
	if (_catalog) return _catalog;
	let items = [];
	let errors = [];
	const urls = (typeof _settings.fullCatalog === "undefined" || _settings.fullCatalog)
		? FULL_CATALOG_URLS : [];
	for (const u of urls) {
		try {
			const d = httpGetJson(u);
			const arr = (d.series || []).map(normalizeItem).concat((d.movies || []).map(normalizeItem));
			if (arr.length > 0) { items = arr; break; }
		} catch (e) { errors.push(u); }
	}
	if (items.length === 0) {
		for (const u of CATALOG_URLS) {
			try {
				const d = httpGetJson(u);
				const arr = (d.series || []).map(normalizeItem).concat((d.movies || []).map(normalizeItem));
				if (arr.length > 0) { items = arr; break; }
			} catch (e) { errors.push(u); }
		}
	}
	if (items.length === 0)
		throw new ScriptException("No se pudo cargar el catálogo: " + errors.join(", "));
	_catalog = items;
	return items;
}
function loadFullCatalog() {
	if (_fullCatalog) return _fullCatalog;
	let items = [];
	for (const u of FULL_CATALOG_URLS) {
		try {
			const d = httpGetJson(u);
			const arr = (d.movies || []).map(normalizeItem);
			if (arr.length > 0) { items = arr; break; }
		} catch (e) {}
	}
	_fullCatalog = items;
	return items;
}
function thumbUrl(item) {
	if (!item.urlImage) return "";
	if (item.urlImage.startsWith("http")) return item.urlImage;
	return "https://image.tmdb.org/t/p/w400" + item.urlImage;
}
function uploadDateMs(item) {
	if (!item.date) return 0;
	const t = Date.parse(item.date);
	return isNaN(t) ? 0 : t;
}
function buildVideo(item) {
	const url = "movpplus://" + item.type + "/" + item.id;
	return new PlatformVideo({
		id: new PlatformID(PLATFORM, item.type + "/" + item.id, config.id),
		name: item.name,
		thumbnails: new Thumbnails([new Thumbnail(thumbUrl(item), 0)]),
		author: new PlatformAuthorLink(new PlatformID(PLATFORM, "movie-plus", config.id), "Movie! Plus", PLATFORM_URL, "", 0),
		uploadDate: uploadDateMs(item),
		duration: 0,
		viewCount: 0,
		isLive: false,
		url: url
	});
}
function sortedCatalog(items) {
	return items.slice().sort((a, b) => uploadDateMs(b) - uploadDateMs(a));
}
function resolveYandex(link) {
	try {
		const res = http.GET("https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=" + encodeURIComponent(link), {
			"Accept": "application/json"
		});
		if (!res.isOk) return null;
		const j = JSON.parse(res.body);
		return j.href || null;
	} catch (e) {
		return null;
	}
}
function buildPlayableSources(item) {
	const sources = [];
	if (item.urls && item.urls.length > 0) {
		for (const u of item.urls) {
			const parts = u.split(",_,");
			const label = parts.length > 0 ? parts[0].trim() : "";
			const token = parts.length > 1 ? parts[parts.length - 1].trim() : u.trim();
			let link = null;
			try { link = decryptToken(token); } catch (e) { continue; }
			if (!link || link.indexOf("http") !== 0) continue;
			if (link.indexOf("yadi.sk") >= 0 || link.indexOf("disk.yandex") >= 0) {
				const href = resolveYandex(link);
				if (href) sources.push(new VideoUrlSource({
					width: 0, height: 0,
					container: "mp4", codec: "h264",
					name: label || "Video",
					bitrate: 0, duration: 0,
					url: href
				}));
			}
		}
	} else if (item.videoToken) {
		try {
			const link = decryptToken(item.videoToken);
			if (link.indexOf("yadi.sk") >= 0 || link.indexOf("disk.yandex") >= 0) {
				const href = resolveYandex(link);
				if (href) sources.push(new VideoUrlSource({
					width: 0, height: 0,
					container: "mp4", codec: "h264",
					name: "Video", bitrate: 0, duration: 0,
					url: href
				}));
			}
		} catch (e) {}
	}
	return sources;
}
function fetchTmdbInfo(item) {
	const seg = item.type === "movie" ? "movie" : "tv";
	try {
		const res = http.GET("https://api.themoviedb.org/3/" + seg + "/" + item.id + "?api_key=" + TMDB_API_KEY + "&language=es", {
			"Accept": "application/json"
		});
		if (!res.isOk) return {};
		const j = JSON.parse(res.body);
		const year = (j.release_date || j.first_air_date || "").substring(0, 4);
		const genres = (j.genres || []).map(g => g.name).join(", ");
		const lines = [];
		if (year) lines.push("Año: " + year);
		if (j.vote_average) lines.push("Puntuación: " + j.vote_average + "/10");
		if (genres) lines.push("Géneros: " + genres);
		if (j.number_of_seasons) lines.push("Temporadas: " + j.number_of_seasons);
		let desc = j.overview || "";
		if (lines.length > 0) desc = lines.join("\n") + "\n\n" + desc;
		return { description: desc.trim(), backdrop: j.backdrop_path ? "https://image.tmdb.org/t/p/w1280" + j.backdrop_path : "" };
	} catch (e) {
		return {};
	}
}

// ---------------------------------------------------------------
// Source API
// ---------------------------------------------------------------
source.enable = function (conf, settings, savedState) {
	config = conf || {};
	_settings = settings || {};
};
source.getHome = function () {
	const items = sortedCatalog(loadCatalog());
	const home = items.filter(x => x.type === "movie").slice(0, 40)
		.concat(items.filter(x => x.type === "series").slice(0, 20));
	return new VideoPager(home.map(buildVideo), false);
};
source.searchSuggestions = function (query) { return []; };
source.getSearchCapabilities = function () {
	return { types: [Type.Feed.Mixed], sorts: [Type.Order.Chronological], filters: [] };
};
source.search = function (query, type, order, filters) {
	const q = (query || "").toLowerCase();
	const all = loadCatalog();
	const filtered = all.filter(x =>
		x.name.toLowerCase().indexOf(q) >= 0 ||
		x.othersNames.toLowerCase().indexOf(q) >= 0
	).slice(0, 100);
	return new VideoPager(filtered.map(buildVideo), false);
};
source.isVideoDetailsUrl = function (url) {
	return typeof url === "string" && url.indexOf("movpplus://") === 0;
};
source.getVideoDetails = function (url) {
	const m = /movpplus:\/\/(movie|series)\/(.+)/.exec(url || "");
	if (!m) throw new ScriptException("URL inválida: " + url);
	const kind = m[1], id = m[2];
	let item = loadCatalog().find(x => x.type === kind && x.id === id);
	if (!item && kind === "movie") item = loadFullCatalog().find(x => x.type === kind && x.id === id);
	if (!item) throw new ScriptException("No encontrado en catálogo: " + url);
	const tmdb = fetchTmdbInfo(item);
	let sources = kind === "movie" ? buildPlayableSources(item) : [];
	if (kind === "movie" && sources.length === 0 && (!item.urls || item.urls.length === 0)) {
		const full = loadFullCatalog().find(x => x.type === "movie" && x.id === item.id);
		if (full) sources = buildPlayableSources(full);
	}
	const video = new MuxVideoSourceDescriptor({ isUnMuxed: false, videoSources: sources });
	let description = item.othersNames || "";
	if (tmdb.description) description = tmdb.description;
	if (kind === "series")
		description = (description ? description + "\n\n" : "") + "[Series: la reproducción requiere MEGA y no está soportada aún en este source]";
	return new PlatformVideoDetails({
		id: new PlatformID(PLATFORM, kind + "/" + id, config.id),
		name: item.name,
		thumbnails: new Thumbnails([new Thumbnail(thumbUrl(item), 0)]),
		author: new PlatformAuthorLink(new PlatformID(PLATFORM, "movie-plus", config.id), "Movie! Plus", PLATFORM_URL, "", 0),
		uploadDate: uploadDateMs(item),
		duration: 0,
		viewCount: 0,
		isLive: false,
		url: url,
		description: description,
		video: video
	});
};

// hook para pruebas
source._decrypt = decryptToken;
