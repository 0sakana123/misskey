// ブラウザで直接表示することを許可するファイルの種類のリスト
// ここに含まれないものは application/octet-stream としてレスポンスされる
// SVGはXSSを生むので許可しない
export const FILE_TYPE_BROWSERSAFE = [
	// Images
	'image/png',
	'image/gif',
	'image/jpeg',
	'image/webp',
	'image/avif',
	'image/apng',
	'image/bmp',
	'image/tiff',
	'image/x-icon',

	// OggS
	'audio/opus',
	'video/ogg',
	'audio/ogg',
	'application/ogg',

	// ISO/IEC base media file format
	'video/quicktime',
	'video/mp4',
	'audio/mp4',
	'video/x-m4v',
	'audio/x-m4a',
	'video/3gpp',
	'video/3gpp2',

	'video/mpeg',
	'audio/mpeg',

	'video/webm',
	'audio/webm',

	'audio/aac',

	// see https://github.com/misskey-dev/misskey/pull/10686
	'audio/flac',
	'audio/wav',
	// backward compatibility
	'audio/x-flac',
	'audio/vnd.wave',
];
/*
https://github.com/sindresorhus/file-type/blob/main/supported.js
https://github.com/sindresorhus/file-type/blob/main/core.js
https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Containers
*/

export const DEFAULT_SERVER_ERROR_IMAGE_URL = 'https://xn--931a.moe/assets/error.jpg';
export const DEFAULT_NOT_FOUND_IMAGE_URL = 'https://xn--931a.moe/assets/not-found.jpg';
export const DEFAULT_INFO_IMAGE_URL = 'https://xn--931a.moe/assets/info.jpg';
export const MFM_TAGS = ['tada', 'jelly', 'twitch', 'shake', 'spin', 'jump', 'bounce', 'flip', 'x2', 'x3', 'x4', 'scale', 'position', 'fg', 'bg', 'border', 'font', 'blur', 'rainbow', 'sparkle', 'rotate', 'ruby', 'unixtime'];

export const ROLE_POLICIES = [
	'gtlAvailable',
	'ltlAvailable',
	'canPublicNote',
	'canInvite',
	'canManageCustomEmojis',
	'canManageAvatarDecorations',
	'canHideAds',
	'driveCapacityMb',
	'pinLimit',
	'antennaLimit',
	'wordMuteLimit',
	'webhookLimit',
	'clipLimit',
	'noteEachClipsLimit',
	'userListLimit',
	'userEachUserListsLimit',
	'rateLimitFactor',
	'avatarDecorationLimit',
] as const;
