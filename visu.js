
// ---- SOLARLOG ----------------------------------------------------
var solarlog = null;

$(document).delegate("#pv", "pagebeforeshow", function() {
    solarlog.prepare();
});

$(document).delegate("#pv", "pagecreate", function() {
    solarlog = new SolarLog("http://192.168.178.24/");

    $('#pv_datebox').bind('datebox', function(e, p) {
        if ( p.method === 'set' ) {
            e.stopImmediatePropagation();
            solarlog.render(p.date);
            $('#pv_datebox').datebox('close');
        } else if (p.method === 'close') {
            $('#pv_datebox').datebox('close');
        }
    });
});

$(document).delegate("#pv", "pageshow", function() {
    solarlog.render(new Date());
    
    var open = function() {
        if (solarlog.date) {
            $('#pv_datebox').val(solarlog.date.transDate('d.m.Y'));
            $('#pv_datebox').datebox('refresh');
        }
        $('#pv_datebox').datebox('open');
    };
    
    $('#pv_day').click(open);
    $('#pv_month').click(open);
    $('#pv_year').click(open);
    
});

// ---- TABS ------------------------------------------------------------------
$(document).on("pageshow", function() {
    $(".nw_tab-header").each(function(idx) {
        var height = $(this).parent().innerHeight() - $(this).outerHeight() - 40;
        $(this).siblings(".nw_tab-content").css('height', height);
    });
});

$(document).on("pagecreate", function() {
    $(".nw_tab-header ul li").on("click",function(){
        $(this).parent().find(".ui-btn-active").removeClass("ui-btn-active");
        $(this).addClass("ui-btn-active");
        var newSelection = $(this).children("a").attr("data-tab-class");
        var prevSelection = $(this).parent().parent().attr("data-tab-selection");
        $("."+prevSelection).addClass("ui-screen-hidden");
        $("."+newSelection).removeClass("ui-screen-hidden");
        $(this).parent().parent().attr("data-tab-selection", newSelection);
        
        $("."+newSelection).find('[data-widget="plot.period"]').each(function(idx) {
            if ($('#' + this.id).highcharts()) {
                $('#' + this.id).highcharts().destroy(); 
                var values = widget.get(widget.explode($(this).attr('data-item')));
                if (widget.check(values))
                    $(this).trigger('update', [values]);
            }
        });
        
    });
});

// idleTimer() takes an optional argument that defines the idle timeout
// timeout is in milliseconds; defaults to 30000
$(document).on('pageinit', function() {
    if (jQuery().idleTimer && navigator.userAgent.match(/iPad/i) != null) {
        $.idleTimer(300 * 1000);
    }
});

$(document).bind('idle.idleTimer', function() {
    $.mobile.changePage("index.php?page=qlock");
});

$(document).bind('active.idleTimer', function() {
    parent.history.back();
});

// idle timer for the door camera
$(document).delegate("#aa_tuerkamera", "pageshow", function() {
    if (jQuery().idleTimer) {
        $('#aa_tuerkamera').idleTimer(120 * 1000);
        $('#aa_tuerkamera').bind('idle.idleTimer', function() {
            parent.history.back();
        });
    }
});
$(document).delegate("#aa_tuerkamera", "pagehide", function() {
    if (jQuery().idleTimer) {
        $('#aa_tuerkamera').idleTimer('destroy');
    }
});

// ----- t r a n s -------------------------------------------------------------

Number.prototype.transExSecondsToHours = function() {
    return (this / (60 * 60)).toFixed(1);
};

Number.prototype.transExKwhToMwh = function() {
    return (this / (1000)).toFixed(2);
};

Number.prototype.transExSecondsToHMS = function() {
    var H = Math.floor(this / (60 * 60));
    var M = Math.floor((this / 60) % 60);
    var S = Math.floor(this % (60 * 60));
    return ('0' + H).slice(-2) + ':' + ('0' + M).slice(-2) + ':' + ('0' + S).slice(-2);
};

Number.prototype.transExByteToMegabyte = function() {
    return (this / (1024 * 1024)).toFixed(1);
};

// -----------------------------------------------------------------------------
// W I D G E T   D E L E G A T E   F U N C T I O N S
// -----------------------------------------------------------------------------



// ----- v i s u ---------------------------------------------------------------
// -----------------------------------------------------------------------------

// ----- visu.format -----------------------------------------------------------
$(document).delegate('[data-widget="visu.format"]', {
    'update': function (event, response) {
        $('#' + this.id).html(parseFloat(response)[$(this).attr('data-format')]() + ' ' + $(this).attr('data-unit'));
    }
});

// ----- visu.percent ----------------------------------------------------------
$(document).delegate('[data-widget="visu.percent"]', {
        'update': function(event, response) {
                $('#' + this.id).html(Math.round(parseInt(response) / 255 * 100) + ' %');
    }
});


// ----- visu.shutter ----------------------------------------------------------
$(document).delegate('[data-widget="visu.button"]', {
        'vmousedown': function(event) { // Short/Long Button
            event.preventDefault();
	    var items = widget.explode($(this).attr('data-item'));
            var obj = this;
            $(obj).attr('data-timer',
                setTimeout(function() {
                    $(obj).attr('data-long', true);
                    io.write(items[1], $(obj).attr('data-val'));
                }, 400)
            );
        },
        'vmouseup': function() { // Short/Long Button
            clearTimeout($(this).attr('data-timer'))
	    var items = widget.explode($(this).attr('data-item'));
            if ($(this).attr('data-long') == 'true') {
                $(this).attr('data-long', false);
            } else {
	        io.write(items[0], $(this).attr('data-val'));
            }
        },
        'click': function(event) {
        
	}
});

// ----- visu.shifter ----------------------------------------------------------
$(document).delegate('span[data-widget="visu.shifter"]', { 
        'update': function(event, response) {
        var step = Math.min((response / $(this).attr('data-max') * 10 + 0.49).toFixed(0) * 10, 100);
        $('#' + this.id + ' img').attr('src', $(this).attr('data-pic').replace('00', step));
    }
});

// ----- visu.map --------------------------------------------------------------
$(document).delegate('[data-widget="visu.map"]', {
    'update': function(event, response) {
        var val = parseFloat(response).toFixed(2);
        
        var str_map = $(this).attr('data-map-str').explode();
        var min_map = $(this).attr('data-map-min').explode();
        var max_map = $(this).attr('data-map-max').explode();

        for (var i = 0; i < str_map.length; i++) {
            var min = parseFloat(min_map[i]).toFixed(2);
            var max = parseFloat(max_map[i]).toFixed(2);
            if (min <= val && max >= val) {
                $('#' + this.id).html(str_map[i]);
                return;
            }
        }
        
        $('#' + this.id).html("invalid mapping");
    }
});

