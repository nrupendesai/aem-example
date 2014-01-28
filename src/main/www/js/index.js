/**
 * A note on naming conventions:  It's common to prefix an object wrapped with jQuery with a $.  Variables below prefixed
 * with a $ will be wrapped with jQuery, and method arguments prefixed with a $ are expected to be already wrapped with
 * jQuery.
 */

// bootstrap the Automation API for our page
angular.module( "index", ["automation"] );

// initialize jQuery API consumer.
$( function () {

	// keeping references for jQuery objects is more efficient than manufacturing them each time we need to access them
	var $doc = $( document ),

	// parent element, we'll use this as a reference for manipulating all child elements
		$p = $( "#modalAPIConsumer" ),
		$rooms = $p.find( ".all-rooms" ),
		$zones = $p.find( ".all-zones" ),

	// for the templates, grab the content of the <script type="text/html"> element and convert it to a jQuery object.
		$roomTpl = $( $( "#room-template" ).text() ),
		$zoneTpl = $( $( "#zone-template" ).text() ),
		consumer;


	/**
	 * Create a view mediator for the consumer.  We could go so far as to create mediators for each list and each
	 * renderer, but this example is simple enough that we don't need to go that far.
	 *
	 * @constructor
	 */
	function APIConsumer() {
		this.data = undefined;

		var $reset = $p.find( ".btn.reset" );

		$reset.on( "click", function ( event ) {
			this.log( "User reset the automation API data to defaults" );

			$doc.trigger( "load-defaults" );
		}.bind( this ) );
	}

	/**
	 * Send a log message to our fictitious server-side logging mechanism.  Maybe we use this for usage metrics.
	 *
	 * @param message Message to send to the server
	 */
	APIConsumer.prototype.log = function ( message ) {
		$.get( "/bin/logging.json", {"message": message, "time": new Date().getTime()} );
	};

	/**
	 * Our list of rooms and zones is static (are we planning renovations anytime soon?), so once we have the defaults
	 * loaded from the server, we don't need to worry about adding / removing on the fly.  We'll only need to update
	 * the renderers in the future when their data properties change.
	 *
	 * @param data eg. { rooms: {...}, zones: {...} }
	 */
	APIConsumer.prototype.setData = function ( data ) {
		// nothing to render, just short-circuit.  data should at least be an empty object, not undefined.
		if ( !data ) {
			return;
		}

		this.data = data;

		// now that we have data for all of the rooms and zones, lets add them to the UI
		this.render( this.data.rooms, $rooms, $roomTpl, this.updateRoom );
		this.render( this.data.zones, $zones, $zoneTpl, this.updateZone );
	};

	/**
	 * Update the structure of a room DOM node after it has been added
	 *
	 * @param $element The jQuery element that has been generated for this renderer
	 * @param name The name / identifier for the current room.
	 * @param room The data for the current room
	 */
	APIConsumer.prototype.updateRoom = function ( $element, name, room ) {
		// make sure that we have an element to update first.
		if ( $element.length === 0 ) {
			return;
		}

		var $btn = $element.find( ".btn.lights" ),
			$name = $element.find( ".room-name" );

		$name.text( name );

		// remove any listener that might already be there.
		$btn.off( "click" );

		if ( room.lights ) {
			$btn.addClass( "active" );
		}
		else {
			$btn.removeClass( "active" );
		}

		// don't worry about updating the UI when we click, there'll be an event dispatched that will fire this
		// renderer again and update the UI.
		$btn.on( "click", function ( event ) {
			var newRoom = Object.create( room );
			newRoom.lights = !newRoom.lights;

			this.log( "User updated room " + $name.text() );

			// trigger an event that will be picked up by the Automation API
			$doc.trigger( "update-room", [$name.text(), newRoom] );
		}.bind( this ) );
	};

	/**
	 * Update the structure of a zone DOM node after it has been added
	 *
	 * @param $element The jQuery element that has been generated for this renderer
	 * @param name The name / identifier for the current zone.
	 * @param zone The data for the current zone
	 */
	APIConsumer.prototype.updateZone = function ( $element, name, zone ) {
		// make sure that we have an element to update first.
		if ( $element.length === 0 ) {
			return;
		}

		var $name = $element.find( ".zone-name" ),
			$opt = $element.find( ".dropdown-menu li a" ),
			$temp = $element.find( ".current-temperature" );

		// reset listeners and state
		$opt.parent().removeClass( "disabled" );
		$opt.off( "click" );

		// set the name and current temperature for the renderer
		$name.text( name );
		$temp.text( zone.temperature );

		// disable the selection for the current temperature
		$opt.filter(function () {
			return $( this ).data( "temp" ) === zone.temperature;
		} ).parent().addClass( "disabled" );

		$opt.on( "click", function ( event ) {
			var newZone = Object.create( zone );
			newZone.temperature = $( this ).data( "temp" );

			this.log( "User updated zone " + $name.text() );

			// trigger an event that will be picked up by the Automation API
			$doc.trigger( "update-zone", [$name.text(), newZone] );
		}.bind( this ) );
	};

	/**
	 * Render the provided map of objects.  Rooms and zones in this example share the same general template structure,
	 * the postSetupCb will allow us to update the DOM once the elements have been added.
	 *
	 * @param map A POJSO containing properties corresponding to rooms or zones
	 * @param $target The jQuery element that we'll add our content to
	 * @param $template The template for rendering the current item
	 * @param postSetupCb A callback method for updating the DOM with renderer data.
	 */
	APIConsumer.prototype.render = function ( map, $target, $template, postSetupCb ) {
		var item;

		// remove existing elements before rendering
		$target.empty();

		if ( !map ) {
			return;
		}

		for ( item in map ) {
			if ( map.hasOwnProperty( item ) ) {
				this.renderItem( item, map[item], $target, $template, postSetupCb );
			}
		}
	};

	/**
	 * Add the current item to the DOM
	 *
	 * @param name The name / identifier of the current object
	 * @param data The data used to update the current renderer
	 * @param $target The jQuery element that we're going to append the renderer to
	 * @param $template The jQuery object that is the template for the current renderer
	 * @param postSetupCb A callback method for updating the DOM with renderer data.
	 */
	APIConsumer.prototype.renderItem = function ( name, data, $target, $template, postSetupCb ) {
		var $element = $template.clone().addClass( name );

		$target.append( $element );

		if ( postSetupCb ) {
			postSetupCb( $element, name, data );
		}
	};

	/**
	 * Consumer is a singleton, but we don't need to worry about implementing a Singleton pattern here because the
	 * constructor is "not accessible" (yes, via obj.prototype.constructor, but such is life in JavaScript :)
	 */
	consumer = new APIConsumer();

	/* ---- API HOOKS ---- */

	/**
	 * When we load defaults, reset the UI with new renderers corresponding to this data
	 */
	$doc.on( "defaults-loaded", function ( event, data ) {
		consumer.log( "Defaults were loaded successfully" );

		consumer.setData( data );
	} );

	/**
	 * When a room is updated, locate the renderer (e.g. .room-name.center-hall) and provide updated data
	 */
	$doc.on( "room-updated", function ( event, name, room ) {
		consumer.log( "Room " + name + " was updated successfully" );

		consumer.updateRoom( $( ".room-template." + name ), name, room );
	} );

	/**
	 * When a zone is updated, locate the renderer (e.g. .zone-name.east-wing) and provide updated data
	 */
	$doc.on( "zone-updated", function ( event, name, zone ) {
		consumer.log( "Zone " + name + " was updated successfully" );

		consumer.updateZone( $( ".zone-template." + name ), name, zone );
	} );

} );