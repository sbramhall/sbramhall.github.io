/**
 * Created by .
 * User: henrik
 * Date: 4/9/11
 * Time: 1:36 PM
 * To change this template use File | Settings | File Templates.
 */


function updateRowColors(){
    var even = $("tr:even");
    even.removeClass('odd_row');
    even.addClass('even_row');
    var even = $("tr:odd");
    even.removeClass('even_row');
    even.addClass('odd_row');
    $("tr:first").removeClass('even_row');
    $("tr:first").removeClass('odd_row');
}

function removeItem(originalArray, itemToRemove) {
    var j = 0;
    while (j < originalArray.length) {
    //	alert(originalArray[j]);
        if (originalArray[j] == itemToRemove) {
            originalArray.splice(j, 1);
    } else { j++; }
    }
    return originalArray;
}


function formatKGCO2e(val){
    if( isNaN( parseFloat( $(this).html() ) ) ) return '0.0';
    return parseFloat(this.value).toFixed(1);
}

(function($) {
        $.fn.kgCO2eFormat = function() {
            this.each( function( i ) {
                $(this).change( function( e ){

                });
            });
            return this; //for chaining
        }
    })( jQuery );





var helper = $.Class({
    init: function(source){
        this.source = source;
    },

    addHelp: function(input){
        
        
    }




})


function addHelp(elem, root){
    var src = $('.src_'+elem);
    if(src.length < 1){
        return;
    }
    var img = $("<span><img src='static/images/question-mark.gif'/ class='img_"+elem+"'/></span>");
    var elems = $("."+elem, root);
    elems.append(img);

    $(img).simpletip({
        fixed: true,
        position: ["-25", "25"],
        content: src.html()


    });

}


    function validateInteger(elem){
        $(elem).keyup(function(event){
            var v = parseInt($(this).val())
            if(v != 0 && !isNaN(v)){
                $($(this).parents()[0]).removeClass('error');
            }

        });
        $(elem).blur(function(event){
            var v = parseInt($(this).val())
            //console.log("e"+parseInt($(this).val()));
            if(v == 0 || isNaN(v)){
                //console.log("ERROR");
                $($(this).parents()[0]).addClass('error');
            }
        });
    }


function blockNonIntegers(event, val, digits){

    //37-40, 9 13
    var kc = event.keyCode;
    //console.log(kc+ " " +String(val).length + "digits"+digits);
    //96 - 105

    var numkeys = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57,
               96, 97, 98, 99, 100, 101, 102, 103, 104, 105];
    var misckeys = [8,9,13,37,38,39,40];
    if(numkeys.indexOf(kc) == -1 && misckeys.indexOf(kc) == -1){
        event.preventDefault();
    } else if (numkeys.indexOf(kc) != -1 && String(val).length > digits){
       event.preventDefault();
    }





//     if (kc != 8 && kc != 9 && kc != 13 && (kc < 37 || (kc > 40 && kc < 48) || kc > 57)) {
//         event.preventDefault();
//       } else if ((kc >= 48 && kc <= 57) && val.length > digits){
//         event.preventDefault();
//     }
}

function round(val, decimals){
    return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
