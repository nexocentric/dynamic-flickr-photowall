//&api_key=25b7fb5c323fa75fe2392cea1ee1d902&user_id=42488861%40N06&format=rest&api_sig=209f2d5441959dcf4f75e49a55b6fdb3
var flickrKey = "76f3106f7634258dce78cd44e03e8b76";
var flickrSecret = "0e017d4172b1b622";
var flickrUserId = "42488861@N06";
var ajaxHandlerPath = 'https://api.flickr.com/services/rest?format=json&jsoncallback=?';
var timestampAttribute = "data_upload_timestamp";
var ajaxRequest = null;
var ajaxTimeout = 300000;
var flickrOptions = "";
var displayPhotos = "";
var maxDisplayNumber = 15;
var emptyPhotoFrameSelector = '.photo-frame > span';
var filledPhotoFrameSelector = '.photo-frame > img';
var photoSelector = '.photo';
var getMaxFromFlickr = maxDisplayNumber;
var flickrPollingInterval = 5000;
var pollFlickrServerFunctionTimeoutHandle = null;
var typeFunction = 'function';
var typeUndefined = 'undefined';
var typeNumber = 'number';
var typeObject = 'object';
var INDEX_NOT_FOUND = -1;
var SELECTED_LANDSCAPE_PHOTO_SIZES = ['b', 'c', 'z'];
var SELECTED_PORTRAIT_PHOTO_SIZES = ['m', 'q'];
var SELECTED_PHOTO_SIZES = SELECTED_LANDSCAPE_PHOTO_SIZES.concat(SELECTED_PORTRAIT_PHOTO_SIZES);
var FLICKR_USER_ID_FOR_SEARCH = '42488861@N06';

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// Adds a new photo to the photowall to the empty frame 
// specified by the JQuery object passed to it.
// [parameters]
// 1) the path or url to the photo
// 2) the timestamp that the picture was uploaded ID
// 3) the JQuery object to replace by the photo
// [return]
// none
//---------------------------------------------------------
function addPhoto(imagePath, uploadTimestamp, jqueryObject, photoWidth, photoHeight) {
	//--------------------------------------
	// load the photo from its url and
	// add it to the photowall when loaded
	//--------------------------------------
	var tooltip = $('<span data-tooltip aria-haspopup="true" class="has-tip" data-options="show_on:large" title="Large Screen Sizes"></span>');
	var img = $('<img class="photo" width="100%" data-width="' + photoWidth + '" data-height="' + photoHeight + '" alt="SOMETHING!">').attr('src', imagePath).attr(timestampAttribute, uploadTimestamp).load(function() {
		if (!this.complete || typeof this.naturalWidth == "undefined" || this.naturalWidth == 0) {
			console.log('Image does not exist.');
		} else {
			$(jqueryObject).first().replaceWith(img);
		}
	});
}

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// Finds a photo to delete by searching for its timestamp,
// and then delete the data.
// [parameters]
// 1) the timestamp to search for
// [return]
// none
//---------------------------------------------------------
function deletePhoto(timestamp) {
	$('img[' + timestampAttribute + '="' + timestamp + '"]').replaceWith('<span>&nbsp;</span>');
	console.log('DELETE THIS TIMESTAMP ONLY:[' + timestamp + ']');
}

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// Generats a list of timestamps from the JSON response
// sent from Flickr.
// [parameters]
// 1) the photo list from twitter
// 2) a list of the photo sizes selected from Flickr
// 3) the maximum number of photos to display
// [return]
// 1) an array on success
// 2) false on parameter error
//---------------------------------------------------------
function fetchTimestampsFromFlickrList(photoList, selectedPhotoSizes, maxPhotoCount) {
	//--------------------------------------
	// declarations
	//--------------------------------------
	var photoIndex = 0;
	var timestampList = new Array();

	//--------------------------------------
	// safety checks
	//--------------------------------------
	if (typeof photoList !== typeObject) {
		console.log('A list of photos from the Flickr JSON object (object.photos) must be passed as a parameter.');
		return false;
	}
	if (typeof selectedPhotoSizes !== typeObject) {
		console.log('An array of photos sizes must be passed as a parameter.');
		return false;
	}

	//--------------------------------------
	// loop through the list of photos
	// from Flickr
	//--------------------------------------
	for (var photoIndex = 0; photoIndex < photoList.length; photoIndex++) {
		//--------------------------------------
		// make sure that the photo has on of
		// the sizes that we specified
		//--------------------------------------
		if (findLinkForLargestPhotoSize(photoList[photoIndex], selectedPhotoSizes) == '') {
			//the picture doesn't have the size needed
			console.log('[' + photoList[photoIndex].dateupload + '] does not contain specified size photo.');
			continue;	
		}
		//add the timestamp to the list
		timestampList.push(photoList[photoIndex].dateupload);
	}
	//trim the list to the maximum number able to be displayed
	return timestampList.slice(0, maxPhotoCount);
}

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// Gets the timestamps of the photos displayed on the
// photowall.
// [parameters]
// none
// [return]
// 1) a list of timestamps of photos on the photowall
//---------------------------------------------------------
function fetchTimestampsFromPhotowall() {
	var timestampList = new Array();

	$(photoSelector).each(function() {
		timestampList.push($(this).attr(timestampAttribute));
		console.log('currently displayed:' + $(this).attr(timestampAttribute));
	});
	return timestampList;
}

//---------------------------------------------------------
// [author]
// Jonas Raoni Soares Silva
// [summary]
// Radomizes an array.
// [parameters]
// 1) an array to shuffle
// [return]
// 1) a shuffled
//---------------------------------------------------------
function shuffleArray(o) { //v1.0
	for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	return o;
}

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// Select the photo frames that are empty.
// [parameters]
// none
// [return]
// 1) a list of jquery objects that represent empty
//    photo frames
//---------------------------------------------------------
function selectEmptyPhotoFrames() {
	return $(emptyPhotoFrameSelector);
}

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// Gets a count of photo frames.
// [parameters]
// 1) an optional boolean if set the true the function
//    counts the number of empty frames
// [return]
// 1) a count of full or empty frames depending on the
//    parameter passed to the function
//---------------------------------------------------------
function countPhotoFrames(countEmptyFrames) {
	//--------------------------------------
	// optional parameter handling
	//--------------------------------------
	if (typeof countEmptyFrames === typeUndefined) {
		countEmptyFrames = false;
	}

	//--------------------------------------
	// initializations
	//--------------------------------------
	var frameSelector = filledPhotoFrameSelector;
	var photoFrameCount = 0;

	// by default count full (img) frames unless specified
	if (countEmptyFrames) {
		frameSelector = emptyPhotoFrameSelector;
	}

	// completed count by type
	return $(frameSelector).length;

}

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// Gets the exact dimensions of the image to be displayed.
// [parameters]
// 1) the photo object from the Flickr list
// 2) the URL of the photo to display
// [return]
// 1) a JSON object with the width and height of the photo
//    (selectable via object.width & object.height)
//---------------------------------------------------------
function getPhotoDimensions(photoObject, photoUrl) {
	//--------------------------------------
	// initializations
	//--------------------------------------
	var photoWidth = 0;
	var photoHeight = 0;

	//--------------------------------------
	// these are all sizes as specified by
	// the Flickr documents for their photo
	// search function on their website
	//--------------------------------------
	if (
		photoUrl.indexOf('_o.jpg') != INDEX_NOT_FOUND
	) {
		photoWidth = photoObject.width_o;
		photoHeight = photoObject.height_o;
	} else if (
		photoUrl.indexOf('_l.jpg') != INDEX_NOT_FOUND
	) {
		photoWidth = photoObject.width_l;
		photoHeight = photoObject.height_l;
	} else if (
		photoUrl.indexOf('_b.jpg') != INDEX_NOT_FOUND
	) {
		photoWidth = photoObject.width_b;
		photoHeight = photoObject.height_b;
	} else if (
		photoUrl.indexOf('_c.jpg') != INDEX_NOT_FOUND
	) {
		photoWidth = photoObject.width_c;
		photoHeight = photoObject.height_c;
	} else if (
		photoUrl.indexOf('_z.jpg') != INDEX_NOT_FOUND
	) {
		photoWidth = photoObject.width_z;
		photoHeight = photoObject.height_z;
	} else if (
		photoUrl.indexOf('_n.jpg') != INDEX_NOT_FOUND
	) {
		photoWidth = photoObject.width_n;
		photoHeight = photoObject.height_n;
	} else if (
		photoUrl.indexOf('_m.jpg') != INDEX_NOT_FOUND
	) {
		photoWidth = photoObject.width_m;
		photoHeight = photoObject.height_m;
	} else if (
		photoUrl.indexOf('_q.jpg') != INDEX_NOT_FOUND
	) {
		photoWidth = photoObject.width_q;
		photoHeight = photoObject.height_q;
	} else if (
		photoUrl.indexOf('_s.jpg') != INDEX_NOT_FOUND
	) {
		photoWidth = photoObject.width_s;
		photoHeight = photoObject.height_s;
	} else if (
		photoUrl.indexOf('_t.jpg') != INDEX_NOT_FOUND
	) {
		photoWidth = photoObject.width_t;
		photoHeight = photoObject.height_t;
	} else if (
		photoUrl.indexOf('_sq.jpg') != INDEX_NOT_FOUND
	) {
		photoWidth = photoObject.width_sq;
		photoHeight = photoObject.height_sq;
	}

	//photo dimensions as a json object
	return {
		width: photoWidth,
		height: photoHeight
	};
}

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// Finds whether a photo is in landscape or portrait
// orientation.
// [parameters]
// 1) the photo object from the Flickr list
// 2) a list of all the selected photo sizes that could be
//    used for display
// [return]
// 1) a string representing the orientation
//---------------------------------------------------------
function calculatePhotoOrientation(photoObject, selectedPhotoSizes) {
	//--------------------------------------
	// initializations
	//--------------------------------------
	var photoUrl = findLinkForLargestPhotoSize(photoObject, selectedPhotoSizes);
	var photoDimensions = getPhotoDimensions(photoObject, photoUrl);

	//--------------------------------------
	// get the orientation
	//--------------------------------------
	if (photoDimensions.width > photoDimensions.height) {
		return 'landscape';
	} else if (photoDimensions.width < photoDimensions.height) {
		return 'portrait';
	}
	return 'square';
}

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// Goes through all of the url properties that a photo
// has and chooses the biggest picture to display.
// [parameters]
// 1) a JSON object representing a single photo
// 2) a list of possible photo sizes
// [return]
// 1) the url of the picture if found
// 2) blank if the specified url doesn't exist
//---------------------------------------------------------
function findLinkForLargestPhotoSize(photoObject, selectedPhotoSizes) {
	//--------------------------------------
	// try and get url for photo from 
	// biggest to smallest 
	// (details on official flickr site)
	//--------------------------------------
	var photoUrl = '';

	//--------------------------------------
	// these are all sizes as specified by
	// the Flickr documents for their photo
	// search function on their website
	//--------------------------------------
	if (
		typeof photoObject.url_o !== typeUndefined
		&& selectedPhotoSizes.indexOf('o') > INDEX_NOT_FOUND
	) {
		photoUrl = photoObject.url_o;
	} else if (
		typeof photoObject.url_l !== typeUndefined
		&& selectedPhotoSizes.indexOf('l') > INDEX_NOT_FOUND
	) {
		photoUrl = photoObject.url_l;
	} else if (
		photoObject.url_b 
		&& selectedPhotoSizes.indexOf('b') > INDEX_NOT_FOUND
	) {
		photoUrl = photoObject.url_b;
	} else if (
		typeof photoObject.url_c !== typeUndefined
		&& selectedPhotoSizes.indexOf('c') > INDEX_NOT_FOUND
	) {
		photoUrl = photoObject.url_c;
	} else if (
		typeof photoObject.url_z !== typeUndefined
		&& selectedPhotoSizes.indexOf('z') > INDEX_NOT_FOUND
	) {
		photoUrl = photoObject.url_z;
	} else if (
		typeof photoObject.url_n !== typeUndefined
		&& selectedPhotoSizes.indexOf('n') > INDEX_NOT_FOUND
	) {
		photoUrl = photoObject.url_n;
	} else if (
		typeof photoObject.url_m !== typeUndefined
		&& selectedPhotoSizes.indexOf('m') > INDEX_NOT_FOUND
	) {
		photoUrl = photoObject.url_m;
	} else if (
		typeof photoObject.url_q !== typeUndefined
		&& selectedPhotoSizes.indexOf('q') > INDEX_NOT_FOUND
	) {
		photoUrl = photoObject.url_q;
	} else if (
		typeof photoObject.url_s !== typeUndefined
		&& selectedPhotoSizes.indexOf('s') > INDEX_NOT_FOUND
	) {
		photoUrl = photoObject.url_s;
	} else if (
		typeof photoObject.url_t !== typeUndefined
		&& selectedPhotoSizes.indexOf('t') > INDEX_NOT_FOUND
	) {
		photoUrl = photoObject.url_t;
	} else if (
		typeof photoObject.url_sq !== typeUndefined
		&& selectedPhotoSizes.indexOf('sq') > INDEX_NOT_FOUND
	) {
		photoUrl = photoObject.url_sq;
	}

	//--------------------------------------
	return photoUrl;
}

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// Returns an array that has the values that are in the
// first array, but not in the second array.
// [parameters]
// 1) array to get the difference from
// 2) array to compare against
// [return]
// 1) an array with the difference of the two arrays
//---------------------------------------------------------
function arrayDifference(array1, array2) {
	return $(array1).not(array2).get();
}

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// Parses the response from Flickr and prepares some of the
// pictures to be dipslay on the photowall.
// [parameters]
// 1) the json object response from Flickr
// [return]
// 1) true on successful parse
// 2) an empty array if there are no new picures to display
//    and the wall is full
//---------------------------------------------------------
function parseFlickrPhotoList(json) {
	//--------------------------------------
	// safety check
	//--------------------------------------
	photoList = json.photos.photo;
	console.log(photoList);
	var filledPhotoFrameCount = countPhotoFrames();
	var photoIndex = 0;
	var photoUrl = '';
	
	//--------------------------------------
	// get old and new timestamps for 
	// comparsion
	//--------------------------------------
	newestFlickrPhotosTimestamps = fetchTimestampsFromFlickrList(photoList, SELECTED_PHOTO_SIZES, maxDisplayNumber);
	photoWallTimestamps = fetchTimestampsFromPhotowall();

	//--------------------------------------
	// find the timestamps that are in the 
	// array on the left that are not in
	// the ones on the right
	//--------------------------------------
	displayList = arrayDifference(newestFlickrPhotosTimestamps, photoWallTimestamps);
	deleteList = arrayDifference(photoWallTimestamps, newestFlickrPhotosTimestamps);

	//--------------------------------------
	// if there are no items to delete and
	// there are no empty frames there are
	// no changes to be made
	//--------------------------------------
	if (filledPhotoFrameCount > 0 && deleteList.length == 0) {
		console.log('No new photos to display.');
		return [];
	}

	//--------------------------------------
	// randomize the list for a nice flip-
	// board effect
	//--------------------------------------
	if (filledPhotoFrameCount == 0) {
		photoList = shuffleArray(photoList);	
	};

	console.log('display list:' + displayList);
	console.log('list of photos to delete:' + deleteList);

	//--------------------------------------
	// empty the oldest pictures found
	//--------------------------------------
	for (photoIndex = 0; photoIndex < deleteList.length; photoIndex++) {
		deletePhoto(deleteList[photoIndex]);
	};

	//--------------------------------------
	// make sure that we know the maximum
	// number of empty slots and select them
	// for updating
	//--------------------------------------
	emptyPhotoFrameCount = countPhotoFrames(true);
	emptyPhotoFramesJqueryObject = selectEmptyPhotoFrames();

	//--------------------------------------
	// make sure the number of photos to
	// display doesn't exceed empty frames
	//--------------------------------------
	displayList = displayList.slice(0, emptyPhotoFrameCount);

	//--------------------------------------
	// loop through the pictures and insert
	// them into the empty frames
	//--------------------------------------
	for (photoIndex = 0; photoIndex < displayList.length; photoIndex++) {
		//if it's been deleted make sure not to display it again
		if (deleteList.indexOf(photoList[photoIndex].dateupload) > -1) {
			console.log('picture skipped');
			continue;
		}

		//select the size by orientation
		photoOrientation = calculatePhotoOrientation(photoList[photoIndex], SELECTED_PHOTO_SIZES);
		if (photoOrientation == 'portrait') {
			photoUrl = findLinkForLargestPhotoSize(photoList[photoIndex], SELECTED_PORTRAIT_PHOTO_SIZES);
		} else {
			photoUrl = findLinkForLargestPhotoSize(photoList[photoIndex], SELECTED_LANDSCAPE_PHOTO_SIZES);
		}

		//the photo doesn't have the url we're looking for,
		//so don't add it to the wall
		if (photoUrl == '') {
			continue;
		}

		//this is a unique id used to find the photo on the wall
		photoUploadDate = photoList[photoIndex].dateupload;

		//needed to add special effects to the frame
		photoDimensions = getPhotoDimensions(photoList[photoIndex], photoUrl);
		
		//this downloads the photo and adds it to the wall
		addPhoto(
			photoUrl, 
			photoUploadDate, 
			emptyPhotoFramesJqueryObject[photoIndex],
			photoDimensions.width,
			photoDimensions.height	
		);
	}
	return true;
}

// function parseFunctionName(functionHandle) {
// 	var functionAsString = functionHandle.toString();
	
// }

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// A wrapper function for the javascript functions
// setTimeout and clearTimeout. 
// [parameters]
// 1) a function to call when the timeout ends 
//    or the handle of the timeout to cancel
// 2) the interval to wait before calling the function
//    [not needed if cancelling] in mileseconds
// [return]
// 1) the id handle for the timeout on successful que
// 2) true if the timeout has been cancelled from the que
// 3) false on parameter error
//---------------------------------------------------------
function toggleFunctionTimeout(functionHandle, waitInterval) {
	//--------------------------------------
	// safety check
	//--------------------------------------
	if (typeof functionHandle === typeUndefined) {
		console.log('No function specified for timeout.');
		return false;
	}

	//--------------------------------------
	// check to see if the developer wanted
	// to set a timeout or cancel one
	//--------------------------------------
	if (typeof functionHandle === typeFunction) {
		//--------------------------------------
		// make sure a timeout was specified
		// otherwise cancel and warn developer
		//--------------------------------------
		if (typeof waitInterval === typeUndefined) {
			console.log('You must specify a timeout interval in milliseconds.');
			return false;
		}
		//set the timeout and return timeout id
		console.log('[' + waitInterval + '] millisecond timeout set for [' + functionHandle.toString() + '] function.');
		return window.setTimeout(functionHandle, waitInterval);
	}

	//cleat the timeout and notify the developer
	console.log('Cancelling timeout for [' + functionHandle + '] function.');
	window.clearTimeout(functionHandle);
	return true;
}

//---------------------------------------------------------
// [author]
// Dodzi Y. Dzakuma
// [summary]
// This checks the Flickr server for photo updates. This 
// function calls parseFlickrPhotoList to parse the list.
// [parameters]
// none
// [return]
// none
//---------------------------------------------------------
function pollFlickrServer() {
	//----------------------------------
	// make the AJAX call and wait
	// for a reply from PHP
	//----------------------------------
	$.ajax({
		url: ajaxHandlerPath,
		type: 'POST',
		data: {
			api_key: flickrKey,
			method: 'flickr.photos.search',
			privacy_filter: 1,
			content_type: 1,
			per_page: getMaxFromFlickr,
			user_id: FLICKR_USER_ID_FOR_SEARCH,
			extras: 'date_upload,url_b,url_c,url_z,url_n,url_l,url_q,url_sq,url_m'
		},
		success: parseFlickrPhotoList,
		dataType: 'json',
		complete: function() {
			pollFlickrServerFunctionTimeoutHandle = toggleFunctionTimeout(pollFlickrServer, flickrPollingInterval)
		},
		timeout: ajaxTimeout
	});
}