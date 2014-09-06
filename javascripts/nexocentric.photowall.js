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
var maxDisplayNumber = 12;
var getMaxFromFlickr = maxDisplayNumber;
var flickrPollingInterval = 5000;
var pollFlickrServerFunctionTimeoutHandle = null;
var typeFunction = 'function';
var typeUndefined = 'undefined';
var typeNumber = 'number';

Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};

// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
}

function addImage(imagePath, uploadTimestamp, jqueryObject) {
	var img = $('<img class="photo" width="100%" alt="">').attr('src', imagePath).attr(timestampAttribute, uploadTimestamp).load(function() {
		if (!this.complete || typeof this.naturalWidth == "undefined" || this.naturalWidth == 0) {
			console.log('broken image!');
		} else {
			$(jqueryObject).first().replaceWith(img);
		}
	});
}

function deleteImage(timestamp) {
	console.log('DELETE THIS TIMESTAMP ONLY:[' + timestamp + ']');
	$('img[' + timestampAttribute + '="' + timestamp + '"]').replaceWith('<span>&nbsp;</span>');
}

function getNewestFlickrTimestamps(list) {
	var photoIndex = 0;
	var timestampList = new Array();
	for (var photoIndex = 0; photoIndex < photoList.length; photoIndex++) {
		if (
			typeof photoList[photoIndex].url_b === 'undefined'
			&& typeof photoList[photoIndex].url_c === 'undefined'
			&& typeof photoList[photoIndex].url_z === 'undefined'
		) {
			console.log("size is undefined for");
			continue;	
		}
		console.log('newest[' + photoIndex + ']:' + photoList[photoIndex].dateupload)
		timestampList.push(photoList[photoIndex].dateupload);
	}
	return timestampList.slice(0, maxDisplayNumber);
}

function getUploadTimestampsFromPhotoWall() {
	var timestampList = new Array();

	$('.photo').each(function() {
		timestampList.push($(this).attr(timestampAttribute));
		console.log('currently displayed:' + $(this).attr(timestampAttribute));
	});
	return timestampList;
}

function filterPhotosForDisplay(oldList, newList) {
	var filteredList = new Array();
	for (var itemIndex = 0; itemIndex < oldList.length; itemIndex++) {
		if(alreadyDisplayed(newList, oldList)) {
			continue;
		}
		filteredList.push(newList[itemIndex]);
	};
	return filteredList;
}

function alreadyDisplayed(uploadTimestamp, oldList) {
	for (var itemIndex = 0; itemIndex < oldList.length; itemIndex++) {
		if(uploadTimestamp == oldList[itemIndex]) {
			return true;
		}
	}
	return false;
}

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffleArray(o){ //v1.0
	for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	return o;
};

//---------------------------------------------------------
// [author]
// [summary]
// [parameters]
// [return]
//---------------------------------------------------------
function photosDisplayedOnPhotowall() {
	//--------------------------------------
	// initalizatinos
	//--------------------------------------
	var photoCount = $('.photo-frame > img').length;

	//--------------------------------------
	// check status
	//--------------------------------------
	if (photoCount == 0) {
		console.log('No photos are currently displayed on the photowall.');
		return false;
	}

	//--------------------------------------
	// photos exist
	//--------------------------------------
	console.log('[' + photoCount + '] photo(s) currently displayed on the photowall.');
	return true;
}

function compareFlickrPhotoListToPhotowall(flickrJsonResponse) {
	//--------------------------------------
	// safety check
	//--------------------------------------
	photoList = json.photos.photo;

	var photosDisplayed = $('.photo-frame > img').length;
	
	newestFlickrPhotosTimestamps = getNewestFlickrTimestamps(photoList);
	photoWallTimestamps = getUploadTimestampsFromPhotoWall();


	displayList = newestFlickrPhotosTimestamps.diff(photoWallTimestamps);
	deleteList = photoWallTimestamps.diff(newestFlickrPhotosTimestamps);

	if (photosDisplayed > 0 && deleteList.length == 0) {
		console.log('No new photos to display.');
		return deleteList;
	}
}

//---------------------------------------------------------
// [author]
// [summary]
// [parameters]
// [return]
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
	var frameType = 'img';
	var photoFrameCount = 0;

	// by default count full (img) frames unless specified
	if (countEmptyFrames) {
		frameType = 'span'; //span types are empty frames
	}

	// completed count by type
	return $('.photo-frame > ' + frameType).length;

}

//---------------------------------------------------------
// [author]
// [summary]
// [parameters]
// [return]
//---------------------------------------------------------
function parseFlickrPhotoList(json) {
	//--------------------------------------
	// safety check
	//--------------------------------------
	photoList = json.photos.photo;
	console.log(photoList);
	var photosDisplayed = countPhotoFrames();

	if (photosDisplayed == 0) {
		photoList = shuffleArray(photoList);	
	};
	
	newestFlickrPhotosTimestamps = getNewestFlickrTimestamps(photoList);
	photoWallTimestamps = getUploadTimestampsFromPhotoWall();


	displayList = newestFlickrPhotosTimestamps.diff(photoWallTimestamps);
	deleteList = photoWallTimestamps.diff(newestFlickrPhotosTimestamps);

	if (photosDisplayed > 0 && deleteList.length == 0) {
		console.log('No new photos to display.');
		return deleteList;
	}

	console.log('display list:' + displayList);
	console.log('list of photos to delete:' + deleteList);

	for (var photoIndex = 0; photoIndex < deleteList.length; photoIndex++) {
		deleteImage(deleteList[photoIndex]);
	};

	availablePhotoFrames = countPhotoFrames(true);

	var photoIndex = 0;
	var upperLimit = $(availablePhotoFrames).length;
	if (upperLimit > 0) {
		upperLimit = upperLimit;
	}
	displayList = displayList.slice(0, upperLimit);
	for (var photoIndex = 0; photoIndex < displayList.length; photoIndex++) {
		if (alreadyDisplayed(photoList[photoIndex].dateupload, deleteList)) {
			console.log('picture skipped');
			continue;
		}

		if (photoList[photoIndex].url_b) {
			addImage(photoList[photoIndex].url_b, photoList[photoIndex].dateupload, availablePhotoFrames[photoIndex]);
		} else if (photoList[photoIndex].url_c) {
			addImage(photoList[photoIndex].url_c, photoList[photoIndex].dateupload, availablePhotoFrames[photoIndex]);
		} else if (photoList[photoIndex].url_z) {
			addImage(photoList[photoIndex].url_z, photoList[photoIndex].dateupload, availablePhotoFrames[photoIndex]);
		}
	}
	return true;
}

//---------------------------------------------------------
// [author]
// [summary]
// [parameters]
// [return]
//---------------------------------------------------------
function toggleFunctionTimeout(functionHandle, pollingInterval) {
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
		if (typeof pollingInterval === typeUndefined) {
			console.log('You must specify a timeout interval in milliseconds.');
			return false;
		}
		//set the timeout and return timeout id
		console.log('[' + pollingInterval + '] millisecond timeout set for [' + functionHandle.toString() + '] function.');
		return window.setTimeout(functionHandle, pollingInterval);
	}

	//cleat the timeout and notify the developer
	console.log('Cancelling timeout for [' + functionHandle + '] function.');
	window.clearTimeout(functionHandle);
	return true;
}

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
			user_id: '42488861@N06',
			extras: 'date_upload,url_b,url_c,url_z,url_n'
		},
		success: parseFlickrPhotoList,
		dataType: 'json',
		complete: function() {
			pollFlickrServerFunctionTimeoutHandle = toggleFunctionTimeout(pollFlickrServer, flickrPollingInterval)
		},
		timeout: ajaxTimeout
	});
}