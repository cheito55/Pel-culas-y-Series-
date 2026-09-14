/*
 * GrayJay Plugin - Seeke
 * Buscador con caratulas TMDB y contenido en espanol latino
 * v1.2 - TMDB catalogo + Seeke links en descripcion + paginado corregido
 */
var _conf = {};
var DEFAULT_TMDB_KEY = "1c7e5ac8a89d07489b3b14d7b3b1b0a2";
var TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function getApiKey() {
    return (_conf && _conf.settings && _conf.settings.tmdbApiKey) || DEFAULT_TMDB_KEY;
}

function tmdbImageUrl(path, size) {
    return TMDB_IMAGE_BASE + "/" + size + path;
}

function parseDate(dateStr) {
    if (!dateStr) return 0;
    var d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : Math.floor(d.getTime() / 1000);
}

function buildThumbnails(posterPath, backdropPath) {
    var thumbs = [];
    if (posterPath) thumbs.push(new Thumbnail(tmdbImageUrl(posterPath, "w500"), 500));
    if (backdropPath) thumbs.push(new Thumbnail(tmdbImageUrl(backdropPath, "w780"), 780));
    return new Thumbnails(thumbs);
}

function seekeSearchUrl(title, year) {
    var q = title + (year ? " " + year : "") + " ver online latino";
    return "https://search.newsparkking.com/search?q=" + encodeURIComponent(q) + "&lang=es";
}

function buildVideoFromTMDB(item, mediaType) {
    var title = item.title || item.name || "Sin titulo";
    var dateStr = item.release_date || item.first_air_date || "";
    var year = dateStr ? dateStr.substring(0, 4) : "";
    var posterPath = item.poster_path || null;
    var backdropPath = item.backdrop_path || null;
    var id = (mediaType || item.media_type || "movie") + "/" + item.id;

    return new PlatformVideo({
        id: new PlatformID("Seeke", String(item.id), _conf.id),
        name: year ? title + " (" + year + ")" : title,
        thumbnails: buildThumbnails(posterPath, backdropPath),
        author: new PlatformAuthorLink(
            new PlatformID("Seeke", "Seeke", _conf.id),
            "Seeke",
            "https://seeke.ai",
            ""
        ),
        uploadDate: parseDate(dateStr),
        duration: 0,
        viewCount: 0,
        url: id,
        isLive: false
    });
}

function tmdbSearch(query, page) {
    var apiKey = getApiKey();
    var url = "https://api.themoviedb.org/3/search/multi?api_key=" + apiKey +
              "&query=" + encodeURIComponent(query) +
              "&language=es-MX&page=" + (page || 1) +
              "&include_adult=false";

    var resp = Http.get(url);
    var data = JSON.parse(resp.body);

    var videos = [];
    if (data && data.results) {
        for (var i = 0; i < data.results.length; i++) {
            var item = data.results[i];
            var mt = item.media_type;
            if (mt === "movie" || mt === "tv") {
                videos.push(buildVideoFromTMDB(item, mt));
            }
        }
    }
    return { videos: videos, totalPages: data.total_pages || 1 };
}

function tmdbDetails(mediaType, tmdbId) {
    var apiKey = getApiKey();
    var url = "https://api.themoviedb.org/3/" + mediaType + "/" + tmdbId +
              "?api_key=" + apiKey + "&language=es-MX&append_to_response=videos,credits,watch_providers";

    var resp = Http.get(url);
    var data = JSON.parse(resp.body);

    var title = data.title || data.name || "Sin titulo";
    var overview = data.overview || "";
    var posterPath = data.poster_path || null;
    var backdropPath = data.backdrop_path || null;
    var dateStr = data.release_date || data.first_air_date || "";
    var year = dateStr.substring(0, 4);
    var displayName = year ? title + " (" + year + ")" : title;

    var authors = [];
    if (data.credits && data.credits.crew) {
        for (var i = 0; i < Math.min(data.credits.crew.length, 5); i++) {
            var c = data.credits.crew[i];
            if (c.job === "Director" || c.job === "Creator") {
                authors.push(c.name);
            }
        }
    }
    var authorName = authors.length > 0 ? authors.join(", ") : "Desconocido";

    var seekeUrl = seekeSearchUrl(title, year);
    var tmdbPageUrl = "https://www.themoviedb.org/" + mediaType + "/" + tmdbId;

    var fullDescription = overview +
        "\n\n---\n" +
        "Ver en Seeke (espanol latino): " + seekeUrl +
        "\n" +
        "Ficha en TMDB: " + tmdbPageUrl;

    var videoSources = [];

    if (data.videos && data.videos.results) {
        for (var j = 0; j < data.videos.results.length; j++) {
            var v = data.videos.results[j];
            if (v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")) {
                videoSources.push(new VideoUrlSource({
                    width: 1280,
                    height: 720,
                    container: "video/mp4",
                    codec: "avc1",
                    name: "Trailer (YouTube)",
                    url: "https://www.youtube.com/watch?v=" + v.key
                }));
                break;
            }
        }
    }

    var genres = [];
    if (data.genres) {
        for (var g = 0; g < data.genres.length; g++) {
            genres.push(data.genres[g].name);
        }
    }
    var genreStr = genres.length > 0 ? "Generos: " + genres.join(", ") + "\n" : "";

    return new PlatformVideoDetails({
        id: new PlatformID("Seeke", String(tmdbId), _conf.id),
        name: displayName,
        thumbnails: buildThumbnails(posterPath, backdropPath),
        author: new PlatformAuthorLink(
            new PlatformID("Seeke", authorName, _conf.id),
            authorName,
            "https://seeke.ai",
            ""
        ),
        uploadDate: parseDate(dateStr),
        duration: 0,
        viewCount: data.vote_count || 0,
        url: mediaType + "/" + tmdbId,
        isLive: false,
        description: genreStr + fullDescription,
        video: new VideoSourceDescriptor(videoSources),
        live: null,
        rating: new RatingLikes(data.vote_count || 0),
        subtitles: []
    });
}

// ===== Source API Implementation =====

source.enable = function(conf) {
    _conf = conf;
};

source.getHome = function(continuationToken) {
    var apiKey = getApiKey();
    var url = "https://api.themoviedb.org/3/trending/all/week?api_key=" + apiKey +
              "&language=es-MX";

    if (continuationToken && continuationToken.page) {
        url += "&page=" + continuationToken.page;
    }

    var resp = Http.get(url);
    var data = JSON.parse(resp.body);

    var videos = [];
    if (data && data.results) {
        for (var i = 0; i < data.results.length; i++) {
            var item = data.results[i];
            var mt = item.media_type;
            if (mt === "movie" || mt === "tv") {
                videos.push(buildVideoFromTMDB(item, mt));
            }
        }
    }

    var page = (continuationToken && continuationToken.page) || 1;
    return new SeekePager(videos, data.total_pages > page, { page: page + 1, type: "home" });
};

source.getSearchCapabilities = function() {
    return {
        types: [Type.Feed.Mixed],
        sorts: [],
        filters: []
    };
};

source.search = function(query, type, order, filters, continuationToken) {
    var page = (continuationToken && continuationToken.page) || 1;
    var result = tmdbSearch(query, page);
    return new SeekePager(result.videos, result.totalPages > page, { page: page + 1, query: query, type: "search" });
};

source.searchSuggestions = function(query) {
    try {
        var apiKey = getApiKey();
        var url = "https://api.themoviedb.org/3/search/multi?api_key=" + apiKey +
                  "&query=" + encodeURIComponent(query) + "&language=es-MX&page=1&include_adult=false";
        var resp = Http.get(url);
        var data = JSON.parse(resp.body);
        var suggestions = [];
        if (data && data.results) {
            for (var i = 0; i < Math.min(data.results.length, 5); i++) {
                var item = data.results[i];
                var title = item.title || item.name;
                if (title) suggestions.push(title);
            }
        }
        return suggestions;
    } catch(e) {
        return [];
    }
};

source.isContentDetailsUrl = function(url) {
    return /^(movie|tv)\/\d+/.test(url);
};

source.getContentDetails = function(url) {
    var match = url.match(/^(movie|tv)\/(\d+)/);
    if (!match) throw new Error("Invalid Seeke URL: " + url);
    return tmdbDetails(match[1], match[2]);
};

source.getChannelContents = function(url, type, order, filters, continuationToken) {
    return new SeekePager([], false, {});
};

source.searchChannels = function(query, continuationToken) {
    return new SeekePager([], false, {});
};

source.getChannel = function(url) {
    return new PlatformChannel({
        id: new PlatformID("Seeke", "Seeke", _conf.id),
        name: "Seeke",
        thumbnails: new Thumbnails([new Thumbnail("https://seeke.ai/favicon.ico", 64)]),
        url: "https://seeke.ai",
        subscriberCount: 0
    });
};

// ===== Pager =====

class SeekePager extends VideoPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }
    nextPage() {
        if (this.context && this.context.type === "search" && this.context.query) {
            var result = tmdbSearch(this.context.query, this.context.page);
            return new SeekePager(result.videos, result.totalPages > this.context.page, { page: this.context.page + 1, query: this.context.query, type: "search" });
        }
        return source.getHome(this.context);
    }
}
