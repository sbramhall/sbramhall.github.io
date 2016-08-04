
var geocoder = new google.maps.Geocoder();
var directionsService = new google.maps.DirectionsService();

function metersToMiles(meters){
    return meters * 0.000621371192;
}


var Location = $.Class({
   init: function(leg){
       this.leg = leg;
       this.address = null;
       this.position = null;
       this.marker = null;
       this.input = null;
   },

   update: function(address){
        var location = this;

        geocoder.geocode( { 'address': address}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                location.set(address, results[0].geometry.location);
                location.leg.trip.map.setCenter(location.position);
                location.leg.update();
                //$(location.input).val(results[0].)
                $(location.input).parents('td').removeClass('error')
            } else {
                location.clear();

                location.leg.update();
                location.leg.route.distance = 0;
                location.leg.updateDistance();
                $(location.input).parents('td').addClass('error')
            }
        });
   },

   set: function(address, position){
       this.address = address;
       this.position = position;
       if(this.marker == null){
           this.marker = new google.maps.Marker({
               map: this.leg.trip.map,
               position: position
           });
       } else {
        this.marker.setPosition(position);
       }
   },

   clear: function(){
     this.position = null;
     this.address = null;
     if(this.marker == null) return;
     this.marker.setMap(null);
     this.marker = null;
   }
});

var AirRoute = $.Class({
   init: function(leg){
       this.leg = leg;
       this.path = null;
       this.distance = 0;
   },

   update: function(){
       if(this.path != null){
            var p = this.path.getPath();
            while (p.getLength()) {
                p.pop();
            }
        }
        var geodesicOptions = {
          strokeColor: '#CC0099',
          strokeOpacity: 1.0,
          strokeWeight: 3,
          geodesic: true
        };
        this.path = new google.maps.Polyline(geodesicOptions);
        this.path.setMap(this.leg.trip.map);

        p = this.path.getPath();
        p.push(this.leg.origin.position);
        p.push(this.leg.destination.position);


       this.distance = google.maps.geometry.spherical.computeLength(p);
       this.leg.updateDistance()
   },

   clear: function(){
       if(this.path == null){
           return;
       }
       var p = this.path.getPath();
       while (p.getLength()) {
           p.pop();
       }
       this.path.setMap(null);
       this.path = null;
       this.distance = 0;
   }

});

var RoadRoute = $.Class({
    init: function(leg){
        this.leg = leg;
        this.directions = new google.maps.DirectionsRenderer();
        this.distance = 0;
    },

    update: function(){
        this.directions.setMap(this.leg.trip.map);
        var request = {
            origin:this.leg.origin.position,
            destination:this.leg.destination.position,
            travelMode: google.maps.DirectionsTravelMode.DRIVING,
            unitSystem: google.maps.DirectionsUnitSystem.IMPERIAL
        };
        var route = this;
        directionsService.route(request, function(response, status) {
            if (status == google.maps.DirectionsStatus.OK) {
              route.directions.setDirections(response);
              route.distance = 0;
               var legs = response.routes[0].legs;
              for(var i=0; i < legs.length; i++){
                route.distance = route.distance + legs[i].distance.value;
                route.leg.updateDistance();
              }
                $($('.distance', route.leg.row).parents()[0]).removeClass('error');
                $('.distance-error').html("");
            } else {
                $($('.distance', route.leg.row).parents()[0]).addClass('error');
                $('.distance-error').html("no land route found");
            }
        });
    },
    clear: function(){
        if(this.directions == null) return;

        this.directions.setMap(null);
        this.direction = null;
        this.distance = 0;
        $($('.distance', this.leg.row).parents()[0]).removeClass('error');
        $('.distance-error').html("");
    }
});

var Leg = $.Class({
    init: function(trip, row, vehicle_row) {
        this.trip = trip;
        this.row = row;
        this.vehicle_row = vehicle_row;
        this.origin = new Location(this);
        this.destination = new Location(this);

        this.distance = 0;

        this.transport_type = null;
        this.subtype = null;
        this.car_kind = null;
        this.car_year = null;
        this.fuel_type = null;
        this.radioactive_forcing = null;

        this.co2e_mile = 0;
        this.co2e = 0;
        this.carbon = null;

        this.return_trip = false;
        this.travellers = 1;
        this.num_buses = 1;

        //formfields
        this.distance_out = null;
        this.carbon_out = null;
        //this.setMode('Car');
    },



    initRoute: function(){
        if(this.origin == null || this.destination == null) return;
        if(this.route != null){
            this.route.clear();
        }
        if(this.transport_type == 'Car' || this.transport_type == 'Bus'
                || this.transport_type == 'Taxi'
                || this.transport_type == 'Charter Bus'){
            console.log('init road');
            this.route = new RoadRoute(this);
        }
        if(this.transport_type == 'Air'){
            console.log('init air');
            this.route = new AirRoute(this);
        }
    },

    update: function(){
        if(this.origin.position == null || this.destination.position == null || this.transport_type == null){
            if(this.route != null){
                this.route.clear();
            }
            return;
        } else {
            this.route.update();
        }
        this.updateDistance();
    },

    updateDistance: function(){
        this.set('distance', metersToMiles(this.route.distance));

        var dist = parseFloat(this.distance * (1+this.return_trip)).toFixed(1);
        $(this.distance_out).html(dist);

    },

    set: function(key, val){
        console.log('set '+key+':'+val);
        if(this[key] == val){
            return;
        }
        if(val == 'Choose Type' || val == 'null'){
            
            val = null;
            this.set('co2e_mile', 0);
            return;
        }
        this[key] = val;
        if(key == 'transport_type'){
            this.initRoute();
            this.update();
        }
        if(key == 'return_trip'){
           $(this.distance_out).html(round(this.distance * (1+this.return_trip), 1));
        }
        console.log('co2e_mile: '+this.co2e_mile);
        if(this.co2e_mile != null){
            console.log("KEY", key);
            if(key == 'travellers' || key == 'distance' || key =='return_trip' || key=='co2e_mile' ||key=='num_buses'){
                //console.log(this.co2e_mile + " T" + this.travellers +" D" + this.distance +" R"+this.return_trip);\
                //if(this.transport_type == 'Charter Bus'){
                    //console.log("C"+this.co2e_mile + " T" + this.num_buses +" D" + this.distance +" R"+this.return_trip);
                    this.setCarbon(this.co2e_mile * this.travellers * this.distance * (1+this.return_trip));
                //} else {
                //    this.setCarbon(this.co2e_mile * this.travellers * this.distance * (1+this.return_trip));
                //}
                return;
            }
        }
        var url = '/carbon/travel?';
        console.log("adv: "+this.advanced);



        if(this.advanced && this.transport_type == 'Car'){
            console.log("S"+this.subtype+"K"+this.car_kind+"Y"+this.car_year+"F"+this.fuel_type);
            if(this.subtype == null || this.car_kind == null || this.car_year == null || this.fuel_type == null){


                console.log("ISNULL");
                return;
            }
            console.log("S"+this.subtype+"K"+this.car_kind+"Y"+this.car_year+"F"+this.fuel_type);
            url = url + 'advanced=1&' +
                        '&car_type='+this.subtype +
                        '&car_kind='+this.car_kind +
                        '&year='+this.car_year +
                        '&fuel_type='+this.fuel_type;

        } else {

            if(this.transport_type == 'Air'){
                console.log("HMMMM");

                if(this.distance >= 700){
                    this.subtype = 'Long Haul';
                } else if(this.distance >= 300){
                    this.subtype = 'Medium Haul';
                } else {
                    this.subtype = 'Short Haul';
                }
            }
            if(this.transport_type == 'Charter Bus'){
                this.subtype = 'doesntmatter';
            }

            if(this.subtype == null || this.transport_type == null){
                console.log("ISNULL");
                return;
            }



            url = url + 'transport_type='+this.transport_type +
                        '&subtype='+this.subtype;
            if(this.transport_type == 'Air'){
                url = url + '&radioactive_forcing=1';
            }
        }
        console.log(url);
        var wst = this;
        $('#submit-emission').attr('disabled', 'disabled');
        $('#spinner').show();
/*        $.getJSON(url, function(data){
            console.log("ppd"+data);
            wst.set('co2e_mile', data);
            $('#spinner').hide();
            $('#submit-emission').removeAttr('disabled');
        });*/
        var kgCO2 = calcCO2Emultiplier(wst);
        wst.set('co2e_mile',kgCO2)
    },


    validateTransportType: function(){
        if(this.advanced && this.transport_type == 'Car'){
            if(this.subtype == null || this.car_kind == null || this.car_year == null || this.fuel_type == null){
                return false;
            }
            return true;
        } else {
            if(this.transport_type == 'Air' || this.transport_type == 'Charter Bus'){
                return true;
            }
            if(this.subtype == null || this.transport_type == null){
                return false;
            }
            return true
        }
    },

    setCarbon: function(value){
        this.co2e = Math.round(value * 1000) / 1000;
        console.log("co2e"+this.co2e);
        $(this.carbon_out).html(parseFloat(this.co2e).toFixed(0));
        this.trip.updateCarbon();
    },

    clear: function(){
        this.route.clear();
        this.origin.clear();
        this.destination.clear();
    },

    setDestination: function(address){
        if(this.destination.address != address){
            this.destination.update(address);
            //this.update();
        }
    },
    setOrigin: function(address){
        if(this.origin.address != address){
            this.origin.update(address);
            //this.update();
        }
    },


    json: function(){
        return JSON.stringify({
                type: "Itinerary",
                origin: this.origin.address,
                destination: this.destination.address,
                transport_type: this.transport_type,
                distance: this.distance * (1+this.return_trip),
                travellers: this.travellers,
                co2e: this.co2e
            });
    },
    setTransportTypeHelp: function(val){
      for(var i = 0; i < this.trip.transport_mode_docs.length; i++){
          var d = this.trip.transport_mode_docs[i];
          console.log(d+":"+val);

          if(val == d){
              console.log("show");
              $('.img_'+d, this.row).show();
          } else {
              console.log("hide");
                $('.img_'+d, this.row).hide();
          }
      }
    }

});

function set_options(select, values){
    var input = "";
    for(var i =0; i < values.length; i++){
        input = input.concat("<option value='"+values[i][1]+"'>"+values[i][0]+"</option>");
    }
    select.html(input);
}

var Trip = $.Class({
    init: function(map_canvas, list_elem, subtypes, car_kinds, hybrid_years, years){

        this.legs = [];
        this.list_elem = list_elem;
        this.subtypes = subtypes;
        this.car_kinds = car_kinds;
        this.hybrid_years = hybrid_years;
        this.years = years;
        var myOptions = {
          zoom: 4,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          center: new google.maps.LatLng(41.3133431, -72.92826179999997),
          scrollwheel: false
        };
        this.map = new google.maps.Map(map_canvas, myOptions);
        
        this.multiplier = 1;
        
    },


    addLeg: function(){
        var row = $('.travel-template').clone();
        row.removeClass('travel-template');
        var vehicle_row = $('.vehicle-template').clone();
        vehicle_row.removeClass('vehicle-template');
        

        var trip = this; //why this uglyness?


        var leg = new Leg(this, row, vehicle_row);
        this.legs[this.legs.length] = leg;

        this.list_elem.append(row);
        this.list_elem.append(vehicle_row);



        leg.origin.input = $('.origin', row).blur(function(event){
            leg.setOrigin(this.value)
        });

        leg.destination.input = $('.destination', row).blur(function(event){
            leg.setDestination(this.value);
        });


        $('.travellers', row).keydown(function(event){
            blockNonIntegers(event, $(this).val(), 4);
        });

        validateInteger($('.travellers', row));

        $('.travellers', row).keyup(function(event){
            leg.set('travellers', $(this).val());
        });
        leg.travellers = $('.travellers', row).val();

        $('.return_trip', row).change(function(event){
            if ($(this).is(":checked")){
                leg.set('return_trip', 1);
            } else {
                leg.set('return_trip', 0);
            }
        });
        leg.set('return_trip', false);


        $('.car-kind', vehicle_row).change(function(event){
            var val = $(this).val();
            if(val == "idk"){
                leg.advanced = false;
                //leg.set('advanced',false);
                $('.fuel-type', vehicle_row).hide();
                $('.car-year', vehicle_row).hide();

            } else {
                //leg.set('advanced',true);
                leg.advanced = true;
                $('.fuel-type', vehicle_row).show();
                $('.car-year', vehicle_row).show();
                
                if(val == 'hybrid' && leg.car_kind != 'hybrid'){
                    var years = trip.hybrid_years[leg.subtype];
                    leg.car_year = null;
                    leg.set('co2e_mile', 0);
                    set_options($('.car-year', vehicle_row), years);
                } else if((leg.car_kind == 'hybrid' || leg.car_kind == null || leg.car_kind == 'idk') && val != 'hybrid'){
                    var years = trip.years;
                    leg.car_year = null;
                    leg.set('co2e_mile', 0);
                    set_options($('.car-year', vehicle_row), years);
                }


            }
            leg.set('car_kind', val);
        });
        leg.set('car_kind', $('.car-kind', vehicle_row).val());

        $('.car-year', vehicle_row).change(function(event){
            leg.set('car_year', $(this).val());
        });
        leg.set('car_year', $('.car-year', vehicle_row).val());
        $('.fuel-type-input', vehicle_row).change(function(event){
            leg.set('fuel_type', $(this).val());
        });
        leg.set('fuel_type', $('.fuel-type-input', vehicle_row).val());
        
        $('.subtype', row).change(function(event){

            var val = $(this).val();
            console.log("subtypechanged "+val);
            set_options($('.car-year', vehicle_row), [[' - ', 'null']]);
            if (val == 'Passenger Car' || val == 'Pickup/Van/SUV'){
                $('div.car-model', vehicle_row).show();
                $('div.fuel-type', vehicle_row).show();
                //set_options($('.subtype', row), trip.subtypes['adv_car']);
                //leg.set('subtype', $('.subtype', row).val());
                leg.advanced = true;
                leg.set('co2e_mile', 0);
                leg.car_year = null;
                leg.car_kind = null;
                //leg.set('advanced', true);
                var kinds = trip.car_kinds[val];

                set_options($('.car-kind', vehicle_row), kinds);
                leg.set('car_year', $('.car-year', vehicle_row).val());
                leg.set('fuel_type', $('.fuel-type-input', vehicle_row).val());
                leg.set('car_kind', $('.car-kind', vehicle_row).val());



           } else {
                leg.advanced = false;
                $('div.car-model', vehicle_row).hide();
                $('div.fuel-type', vehicle_row).hide();

                leg.car_year = null;
                leg.car_kind = null;

                //set_options($('.subtype', row), trip.subtypes['car']);
                //leg.set('subtype', $('.subtype', row).val());
                //leg.set('advanced', false);
           }
           leg.set('subtype', val);


        });
        set_options($('.subtype', row), trip.subtypes['car']);
        leg.set('subtype', $('.subtype', row).val());

//        $('.num-buses', row).blur(function(event){
//            leg.set('num_buses', $(this).val());
//        });
        
        //$('.num-buses', row).hide();


        $('.travel-mode', row).change(function(event){
           var val = $(this).val();
           leg.set('subtype', 'null');
            leg.subtype = null;

           leg.set('transport_type', val);
           var st = $('.subtype', row);
           if(val == 'Air'){
              set_options(st, []);
               st.hide();
               $('div.advanced-car', vehicle_row).hide();
               //$('.num-buses', row).hide();
               leg.setTransportTypeHelp('doc_air');
               $('.quantity-type', row).html('passengers');
           }
           if(val == 'Taxi'){
               console.log(trip.subtypes['taxi']);
               set_options(st, trip.subtypes['taxi']);
               st.show();
               $('div.advanced-car', vehicle_row).hide();
               //$('.num-buses', row).hide();
               leg.setTransportTypeHelp('doc_taxi');
               $('.quantity-type', row).html('taxis');
           }
           if(val == 'Rail'){
               st.show();
               set_options(st, trip.subtypes['rail']);
               $('div.advanced-car', vehicle_row).hide();
               //$('.num-buses', row).hide();
               leg.setTransportTypeHelp('doc_rail');
               $('.quantity-type', row).html('passengers');
           }
           if(val == 'Bus'){
               st.show();
               set_options(st, trip.subtypes['bus']);
               $('div.advanced-car', vehicle_row).hide();
               //$('.num-buses', row).hide();
               leg.setTransportTypeHelp('doc_bus');
               $('.quantity-type', row).html('passengers');
           }
           if(val == 'Charter Bus'){
               set_options(st, []);
               st.hide();
               $('div.advanced-car', vehicle_row).hide();
               //$('.radioactive-forcing', row).hide();
               //$('.num-buses', row).show();
               //$('.travellers', row).attr('disabled','disabled');
               leg.setTransportTypeHelp('doc_charter');
               $('.quantity-type', row).html('buses');
           }
           //} else {
           //    $('.travellers', row).removeAttr('disabled');
           //}
           if(val == 'Car'){
                st.show();
                set_options(st, trip.subtypes['car']);
                $('div.advanced-car', vehicle_row).show();
               //$('.num-buses', row).hide();
               leg.setTransportTypeHelp('doc_car');
               $('.quantity-type').html('vehicles');
           }


        });
        leg.set('transport_type', 'Car');

        $('div.advanced-car', vehicle_row).show();

        $('.remove-item', row).click(function(event){
           trip.removeLeg(leg);
        });


        $('.fuel-type, .car-year, .car-kind', vehicle_row).change(function(){
            if(leg.validateTransportType()){
                $($('.travel-mode', leg.row).parents()[1]).removeClass('error');
            }
        });
        $('.subtype, .travel-mode', row).change(function(){
            if(leg.validateTransportType()){
                $($('.travel-mode', leg.row).parents()[1]).removeClass('error');
            }
        });
        


        leg.distance_out = $('.distance-value', row);
        leg.carbon_out = $('.co2e-value', row);

        $('div.car-model', vehicle_row).hide();
        $('div.fuel-type', vehicle_row).hide();


        this.transport_mode_docs = ['doc_car', 'doc_air', 'doc_rail', 'doc_bus', 'doc_charter', 'doc_taxi'];
        var docelems = ["doc_mode", "doc_emission", "doc_origin","doc_destination",'doc_num-buses'];
        var docelems = docelems.concat(this.transport_mode_docs);

        for(var i = 0; i < docelems.length; i++){
            addHelp(docelems[i], $(row));
        }
        docelems = ["doc_advanced-car", "doc_fuel-type", "doc_car-model"];
        for(var i = 0; i < docelems.length; i++){
            addHelp(docelems[i], $(vehicle_row));
        }

        leg.setTransportTypeHelp('doc_car');
        vehicle_row.show();
        row.show();
    },




    updateCarbon: function(){
        var total_dist = 0;
        var total_carb = 0;
        for(var i=0; i < this.legs.length; i++){
            if(this.legs[i].co2e == null){
                continue;
            }
            //total_dist = total_dist + this.legs[i].distance;
            total_carb = total_carb + this.legs[i].co2e;
        }
        console.log("TOTCARB", total_carb);
        //this.total_co2e = Math.round(total_carb * this.multiplier * 100) / 100;
        //if( isNaN( parseFloat( $(this).html() ) ) ) return;
        this.total_co2e = parseFloat(total_carb * this.multiplier / 1000).toFixed(2);
        $('#total_carbon').html(this.total_co2e);
        $('#donation').html('$' + (this.total_co2e * 25).toFixed(2));
    },

    setMultiplier: function(val){
        this.multiplier = val;
        this.updateCarbon();
    },

    removeLeg: function(leg){
        leg.row.remove();
        leg.vehicle_row.remove();
        leg.clear();
        removeItem(this.legs, leg);
        this.updateCarbon();
    }

})
    /* added function to calculate emission from distance */
function calcCO2Emultiplier(leg) {
    if(leg.transport_type == 'Air')
    {
        if (leg.distance <= 500)
        {
            kgCO2 = 0.24;
        }
        else
        {
            kgCO2 = 0.18;
        }
    return kgCO2;
    }

    calculation = distance * kgCO2 * 2.7  / 1000;
    console.log( calculation.toFixed(3) + " metric tons");
}
// need a function to calculate $ from tons

