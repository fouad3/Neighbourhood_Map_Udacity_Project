// Global variables
var map;
var markers;
var infoWindow;
var bounds;

// callback function for google maps API
var initMap = function () {

	// create a new map
	map = new google.maps.Map( document.getElementById( 'map' ), {
		center: {
			lat: 30.04442,
			lng: 31.235712
		},
		zoom: 12
	} );

	// Add infoWindow to display on each marker
	infoWindow = new google.maps.InfoWindow( {
		maxHeight: 250
	} );

	// Add boundaries to fit any view for responsive
	bounds = new google.maps.LatLngBounds();

	// create an array of markers
	markers = [];
	for ( var i = 0; i < initLocations.length; i++ ) {
		var title = initLocations[ i ].title;
		var position = initLocations[ i ].location;

		// Create a marker per location
		var marker = new google.maps.Marker( {
			position: position,
			title: title,
			animation: google.maps.Animation.DROP,
			id: i
		} );
		// Push the marker to our array of markers.
		markers.push( marker );
	}

	// Make sure to close the current infowindow if user click at any point of the map
	map.addListener( 'click', function () {
		if ( infoWindow ) {
			infoWindow.close();
			infoWindow = new google.maps.InfoWindow( {
				maxHeight: 250
			} );
		}
	} );
};

// Handle Google Maps API errors
var googleErrors = function () {
	console.log( "There was an error, Couldn't load Google Maps API" );
	alert( "There was an error, Couldn't load Google Maps API" );
};

var viewModel = function () {

	var self = this;

	// store locations in an observable Array
	self.locationList = ko.observableArray( [] );

	self.filter = ko.observable( '' );

	initLocations.forEach( function ( location ) {
		self.locationList.push( location );
	} );

	// Show all markers when map loaded
	self.showMarkers = function () {
		// Extend the boundaries of the map for each marker and display the marker
		for ( var i = 0; i < markers.length; i++ ) {
			markers[ i ].setAnimation( google.maps.Animation.DROP );
			markers[ i ].setMap( map );

			// Create an onclick event to open an infowindow at each marker.
			markers[ i ].addListener( 'click', self.openInfoWindow( markers[ i ] ) );

			bounds.extend( markers[ i ].position );
		}
		map.fitBounds( bounds );
	};

	// Show current marker info when selecting a location from the list
	self.showCurrentMarker = function ( location ) {
		for ( var i = 0; i < markers.length; i++ ) {
			if ( markers[ i ].id === location.id ) {
				self.populateInfoWindow( markers[ i ] );
			}
		}
	};


	// This function populates the infowindow when the marker is clicked. We'll only allow
	// one infowindow which will open at the marker that is clicked, and populate based
	// on that markers position.
	self.populateInfoWindow = function ( marker ) {
		// Check to make sure the infowindow is not already opened on this marker.
		if ( infoWindow.marker !== marker ) {
			infoWindow.marker = marker;
                        
			// change animation
			marker.setAnimation( google.maps.Animation.BOUNCE );
			setTimeout( function () {
				marker.setAnimation( null );
			}, 1400 );
			
			// Foursquare API
			var url = 'https://api.foursquare.com/v2/venues/search';
			var data = 'v=20170803&client_id=YGEW1C2X2OTMS420ZY5AMNWCTHNVUQNMSDJCLDCP2FHIIZUB&' +
				'client_secret=INXEB2TVMCUAFEJIVJDTSOLLKYURNA1GMSMW200CEFHLIKRX&' +
				'query=Pizza&ll=' + marker.getPosition()
				.lat() + ',' + marker.getPosition()
				.lng();

			$.ajax( {
					dataType: 'json',
					url: url,
					data: data
				} )
				.done( function ( data ) {
					// console.log(data.response.venues);
					var restaurants = data.response.venues;
					var rest = restaurants[ 0 ];
					var name = rest.name || '';
					var address = rest.location.address || '';
					var url = rest.url || '';

					infoWindow.setContent( '<h4 class="iw-title">' + marker.title + ' Pizza Restaurants' + '</h4>' +
						'<h5>Name: </h5>' +
						'<p>' + name + '</p>' +
						'<h5>Address: </h5>' +
						'<p>' + address + '</p>' +
						'<h5>URL: </h5>' +
						'<a target="_blank" href="' + url + '">' + name + ' Website' + '</a>' +
						'<h6 class="text-right center-block">Powered by ' +
						'<img src="img/foursquare.png" width="35px"/> Foursquare</h6>'
					);

				} )
				.fail( function ( error ) {
					window.console.log( 'Could not load Foursquare API' );
					infoWindow.setContent( '<div class="alert alert-danger">' +
						'<strong>Error! </strong><span>Could not load Foursquare API</span>' +
						'</div>' );
				} );

			infoWindow.open( map, marker );

			// Make sure the marker property is cleared if the infowindow is closed.
			infoWindow.addListener( 'closeclick', function () {
				infoWindow.marker = null;
			} );
		}
	};

	// open the infowindow of the current marker
	self.openInfoWindow = function ( marker ) {
		return function () {
			self.populateInfoWindow( marker );
		};
	};

	// close the current infowindow
	self.closeInfoWindow = function () {
		if ( infoWindow ) {
			infoWindow.close();
		}
	};

	self.showCurrentMarker = function ( location ) {
		for ( var i = 0; i < markers.length; i++ ) {
			if ( markers[ i ].id === location.id ) {
				self.populateInfoWindow( markers[ i ] );
			}
		}
	};

	// Filtering the list using arrayFilter utility function
	self.filteredLocationList = ko.computed( function () {
		var filter = self.filter()
			.toLowerCase();

		// close the current infowindow
		self.closeInfoWindow();

		// Return all locations if filter is false (user did not write anything)
		if ( !filter ) {
			// Make sure that google maps api script successfully loaded
			// before executing any of its functions
			if ( map ) {
				self.showMarkers();
			} else {
				setTimeout( function () {
					self.showMarkers();
				}, 500 );
			}

			return self.locationList();
		}

		// Filter the locations and markers when filter is true (user start to write)
		else {
			// Filter Locations
			return ko.utils.arrayFilter( self.locationList(), function ( val, idx ) {
				var isMatch = stringStartsWith( val.title.toLowerCase(), filter );

				// Filter Markers
				if ( !isMatch ) {
					markers[ idx ].setMap( null );
				} else {
					markers[ idx ].setAnimation( google.maps.Animation.DROP );
					markers[ idx ].setMap( map );
				}

				// isMatch value (true or false) -Determine which location to return
				return isMatch;
			} );
		}
	}, self );


};

ko.applyBindings( new viewModel() );


// side bar apear when the button is clicked
$( document )
	.ready( function () {
		$( "#sidebar" )
			.niceScroll( {
				cursorcolor: '#53619d',
				cursorwidth: 4,
				cursorborder: 'none'
			} );

		$( '#dismiss, .overlay' )
			.on( 'click', function () {
				$( '#sidebar' )
					.removeClass( 'active' );
				$( '.overlay' )
					.fadeOut();
			} );

		$( '#sidebarCollapse' )
			.on( 'click', function () {
				$( '#sidebar' )
					.addClass( 'active' );
				$( '.overlay' )
					.fadeIn();
				$( '.collapse.in' )
					.toggleClass( 'in' );
				$( 'a[aria-expanded=true]' )
					.attr( 'aria-expanded', 'false' );
			} );
	} );

// set the height of the map when the window is resized
$( window )
	.resize( function () {
		var h = $( window )
			.height(),
			offsetTop = 60; // Calculate the top offset

		$( '#map' )
			.css( 'height', ( h - offsetTop ) );
	} )
	.resize();


// Implement stringStartsWith utility function in KnockoutJS
// Because it's not exported in the minified version https://github.com/knockout/knockout/issues/401
// Check the src file https://github.com/knockout/knockout/blob/master/src/utils.js
var stringStartsWith = function ( string, startsWith ) {
	string = string || "";
	if ( startsWith.length > string.length ) {
		return false;
	}
	return string.substring( 0, startsWith.length ) === startsWith;
};
