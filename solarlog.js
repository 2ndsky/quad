function SolarLog(host) {
    this.host = host;
    this.months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember' ];
    this.shortmonths = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez' ];
    this.vars = {};

    // define all necessary base vars you need
    // unfortunely I found no better way to wrap all vars
    // without defining them as global vars
    this.vars._base_vars_js_needed = [
        'time_start',
        'time_end',
        'Verguetung',
        'AnlagenKWP',
        'StatusCodes',
        'FehlerCodes',
        'SollYearKWP',
        'sollMonth',
    ];

    this.vars._min_cur_js_needed = [
        'Datum',
        'Uhrzeit',
        'Pac',
        'aPdc',
        'curStatusCode',
        'curFehlerCode'
    ];
};

SolarLog.prototype.get = function(filename, options, callback, parseResponse) {
    var varname = filename.replace('.', '_').replace('?', '_');
    if (this.vars['_'+varname+'_pending']) {
        this.vars['_'+varname+'_callbacks'].push(callback);
    } else {
        this.vars['_'+varname+'_pending'] = true;
        this.vars['_'+varname+'_callbacks'] = new Array();
        this.vars['_'+varname+'_callbacks'].push(callback);
        var self = this;
        var data = options || {};
        data.url = this.host + filename
        $.ajax({
            url: 'pages/quad/proxy.php',
            data: data,
            dataType: 'text'
        })
        .done(function(response) {
            parseResponse.call(self, response, varname);
            self.vars['_'+varname+'_pending'] = false;
            for (var i = 0; i < self.vars['_'+varname+'_callbacks'].length; i++) {
                self.vars['_'+varname+'_callbacks'][i].call(self, self.vars['_'+varname]);
            }
        });
    }
};

SolarLog.prototype.localEval = function(response, preCode, postCode) {
    var self = this;
    var js = '(function() {';
    if (preCode)
        js += preCode;
    js += response;
    if (postCode)
        js += postCode;
    js += '})();';
    eval(js);
};

SolarLog.prototype.getVars = function(f, callback) {
    this.get(f, null, callback, function(response, varname) {
        var postCode = 'self.vars._'+varname+' = {';
        for (var i in this.vars['_'+varname+'_needed']) {
            postCode += this.vars['_'+varname+'_needed'][i] + ': ';
            postCode += this.vars['_'+varname+'_needed'][i] + ', ';
        }
        postCode += '};';
        this.localEval(response, null, postCode);
    });
};

SolarLog.prototype.getBaseVars = function(callback) {
    this.getVars('base_vars.js', callback);
};

SolarLog.prototype.getMinCur = function(callback) {
    this.getVars('min_cur.js', callback);
};

SolarLog.prototype.getList = function(f, options, a, i, callback) {
    this.get(f, options, callback, function(response, varname) {
        this.localEval(response, 'var '+a+' = []; var '+i+' = 0;', 'self.vars._'+varname+' = '+a+';');
    });
};

SolarLog.prototype.getMinDay = function(callback) {
    this.getList('min_day.js', null, 'm', 'mi', callback);
};

SolarLog.prototype.getDay = function(day, callback) {
    var day_str = ('0' + day.getFullYear()).slice(-2)
        + ('0' + (day.getMonth()+1)).slice(-2)
        + ('0' + day.getDate()).slice(-2);
    this.getList('min.js?'+day_str, null, 'm', 'mi', callback);
};

SolarLog.prototype.getDays = function(callback) {
    this.getList('days.js', null, 'da', 'dx', callback);
};

SolarLog.prototype.getCurrent = function(callback) {
    this.getDays(function(da) {
        var s1 = da[0].split('|');
        var s2 = s1[1].split(';');
        var current = [this.str2date(s1[0].substr(0,8) + ' 00:00:00').valueOf(), parseInt(s2[0])];
        callback.call(this, current);
    });
};

SolarLog.prototype.getDaysHistory = function(date, callback) {
    var options = {};
    if (date) {
        options.contains = ('0' + (date.getMonth()+1)).slice(-2)
            + '.' + ('0' + date.getFullYear()).slice(-2) + '|';
    }
    this.getList('days_hist.js', options, 'da', 'dx', callback);
};

SolarLog.prototype.getMonths = function(date, callback) {
    var options = {};
    if (date) {
        options.contains = '.' + ('0' + date.getFullYear()).slice(-2) + '|';
    }
    this.getList('months.js', options, 'mo', 'mx', callback);
};

SolarLog.prototype.getYears = function(callback) {
    this.getList('years.js', null, 'ye', 'yx', callback);
};

SolarLog.prototype.date2utc = function(date) { 
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
};

var i = 0;
SolarLog.prototype.str2utc = function(s) {
    return this.str2date(s).valueOf();
};

SolarLog.prototype.str2date = function(s) {
    var s1 = s.split(' ');
    var d = s1[0].split('.');
    var t = s1[1].split(':');
    var year = parseInt(d[2]) + 2000;
    var month = parseInt(d[1]) - 1;
    var day = parseInt(d[0]);
    var hour = parseInt(t[0]);
    var minute = parseInt(t[1]);
    var second = parseInt(t[2]);
    return new Date(year, month, day, hour, minute, second);
};

SolarLog.prototype.countDaysInMonth = function(year, month) {
    var monthStart = new Date(year, month, 1);
    var monthEnd = new Date(year, month + 1, 1);
    return (monthEnd - monthStart) / (1000 * 60 * 60 * 24);
};

SolarLog.prototype.countDaysInYear = function(year) {
    var yearStart = new Date(year, 1, 1);
    var yearEnd = new Date(year + 1, 1, 1);
    return (yearEnd - yearStart) / (1000 * 60 * 60 * 24);
};

SolarLog.prototype.getSollForYear = function(year, month, day, base) {
    var d = new Date();
    if (d.getFullYear() == year) {
        var soll = 0;
        for (var i = 0; i <= month; i++) {
            soll += this.getSollForMonth(year, i, day, base);
        }
        return soll;
    } else {
        return ((base.AnlagenKWP / 1000.0) * base.SollYearKWP);
    }
};

SolarLog.prototype.getSollForMonth = function(year, month, day, base) {
    var d = new Date();
    var soll = ((base.AnlagenKWP / 1000.0) * base.SollYearKWP) / 100.0 * base.sollMonth[month];
    if (d.getMonth() == month && d.getFullYear() == year) {
        return soll / this.countDaysInMonth(year, month) * day;
    } else {
        return soll;
    }
};

SolarLog.prototype.getSollForDay = function(year, month, base) {
    var soll = ((base.AnlagenKWP / 1000.0) * base.SollYearKWP) / 100.0 * base.sollMonth[month];
    return soll / this.countDaysInMonth(year, month);
};

SolarLog.prototype.loading = function(finished) {
    finished = finished || false;
    this.loadingCounter = this.loadingCounter || 0;
    if (!finished) {
        if (this.loadingCounter == 0) {
            $.mobile.loading('show');
        }
        this.loadingCounter++;
    } else {
        this.loadingCounter--;
        if (this.loadingCounter <= 0) {
            $.mobile.loading('hide');
            this.loadingCounter = 0;
        }
    }
};

SolarLog.prototype.prepare = function() {
    if ($('#pv_plot_day').highcharts()) {
        $('#pv_plot_day').highcharts().destroy();
    }
    if ($('#pv_plot_month').highcharts()) {
        $('#pv_plot_month').highcharts().destroy();
    }
    if ($('#pv_plot_year').highcharts()) {
        $('#pv_plot_year').highcharts().destroy();
    }
};

SolarLog.prototype.renderDay = function(date, base, isCurrent) {
    this.loading();
    var cb = function(m) {
        var day = date.getDate();
        var month = date.getMonth();
        var year = date.getFullYear();
        var xmin = this.date2utc(new Date(year, month, day, base.time_start[month], 0, 0)).valueOf();
        var xmax = this.date2utc(new Date(year, month, day, base.time_end[month], 0, 0)).valueOf();
        var dayMax = 0;
        var enabled = [true, false, false, true];
        var types = ['area', 'line', 'line', 'area'];
        var names = ['PAC', 'String 1', 'String 2', 'Ertrag'];
        var yAxis = [0, 0, 0, 1];
        var index = [1, 2, 3, 0];
        var legendIndex = [0, 2, 3, 1];
        var data = new Array(types.length);
        var curPac = 0;
        for (var i = 0; i < types.length; i++) {
            data[i] = new Array();
        }
        for (var mi = (m.length - 1); mi >= 0; mi--) {
            var s1 = m[mi].split('|');
            var s2 = s1[1].split(';');
            curPac = parseInt(s2[3]);
            var pac = parseInt(s2[0]);
            if (dayMax < pac) {
                dayMax = pac;
            }
            for (var i = 0; i < types.length; i++) {
                data[i].push([this.str2utc(s1[0]), parseInt(s2[i])]);
            }
        }
        var series = Array();
        for (var i = 0; i < types.length; i++) {
            if (enabled[i]) {
                series.push({
                    type: types[i],
                    name: names[i],
                    yAxis: yAxis[i],
                    index: index[i],
                    legendIndex: legendIndex[i],
                    data: data[i]
                });
            }
        }
        // draw the plot
        var id = '#pv_plot_day';
        $(id).highcharts({
            chart: { 
                height: $(id).height(), 
                width: $(id).width(),
                marginRight: 50,
                marginLeft: 50,
                marginTop: 40,
            },
            colors: ["#f9a028", '#AAAAAA', '#FF0000', '#0000FF'],
            series: series,
            xAxis: { 
                type: 'datetime',
                min: xmin,
                max: xmax
            },
            yAxis: [{ 
                min: 0, 
                max: 12000,
                title: null,
            }, {
                min: 0,
                max: 80000,
                title: null,
                opposite: true
            }]
        });

        // output day specific values
        $('#pv_day').html(day + '.');
        $('#pv_day_pac').html((curPac / 1000.0).toFixed(2));
        $('#pv_day_eur').html(((curPac / 1000.0) * (base.Verguetung / 10000.0)).toFixed(2));
        $('#pv_day_pac2').html((curPac / base.AnlagenKWP).toFixed(2));
        $('#pv_day_max').html((dayMax / 1000.0).toFixed(2));
        var soll = this.getSollForDay(year, month, base);
        $('#pv_day_soll').html(soll.toFixed(2));
        $('#pv_day_ist').html((100.0 / soll * (curPac / 1000.0)).toFixed(1) + " %");
        this.loading(true);
    };
        
    if (!isCurrent) {
        this.getDay(date, cb);
    } else {
        this.getMinDay(cb);
    }
};

SolarLog.prototype.renderMonth = function(date, base, current) {
    this.loading();
    this.getDaysHistory(date, function(da) {
        var monthPac = current ? current[1] : 0;
        var monthMax = current ? current[1] : 0;
        var year = date.getFullYear();
        var month = date.getMonth();
        var day = date.getDate();
        var xmin = this.date2utc(new Date(year, month, 1)).valueOf();
        var xmax = this.date2utc(new Date(year, month + 1, 1)).valueOf();
        var data = new Array();
        for (var dx = (da.length - 1); dx >= 0; dx--) {
            var s1 = da[dx].split('|');
            var s2 = s1[1].split(';');
            var pac = parseInt(s2[0]);
            monthPac += pac;
            if (monthMax < pac) {
                monthMax = pac;
            }
            data.push([this.str2date(s1[0] + ' 00:00:00').valueOf(), pac]);
        }
        // also push the current value if there is one
        if (current) {
            data.push(current);
        }
        // draw the plot
        var id = '#pv_plot_month';
        $(id).highcharts({
            chart: { 
                height: $(id).height(), 
                width: $(id).width(),
                marginRight: 50,
                marginLeft: 50,
                marginTop: 40,
            },
            plotOptions: {
                series: {
                    point: {
                        events: {
                            click: function() {
                                solarlog.render(new Date(this.x));
                                return false;
                            }
                        }
                    }
                }
            },
            series: [{
                data: data,
                type: 'column',
                name: 'Tageserträge ' + this.months[month]
            }],
            xAxis: { 
                type: 'datetime',
                min: xmin,
                max: xmax
            },
            yAxis: { 
                min: 0, 
                max: 80000,
                title: null,
                plotLines: [{
                    value: this.getSollForDay(year, month, base) * 1000,
                    color : 'red',
                    width : 2,
                }],
            }
        });
        // output the month specific values
        $('#pv_month').html(this.shortmonths[month]);
        $('#pv_month_pac').html((monthPac / 1000.0).toFixed(2));
        $('#pv_month_eur').html(((monthPac / 1000.0) * (base.Verguetung / 10000.0)).toFixed(2));
        $('#pv_month_pac2').html((monthPac / base.AnlagenKWP).toFixed(2));
        $('#pv_month_max').html((monthMax / 1000.0).toFixed(2));
        var soll = 0;
        if (current) {
            var d = new Date(current[0]);
            soll = this.getSollForMonth(d.getFullYear(), d.getMonth(), d.getDate(), base);
        } else {
            soll = this.getSollForMonth(year, month, day, base);
        }
        $('#pv_month_soll').html(soll.toFixed(2));
        $('#pv_month_ist').html((100.0 / soll * (monthPac / 1000.0)).toFixed(1) + " %");
        this.loading(true);
    });
};

SolarLog.prototype.renderYear = function(date, base, current) {
    this.loading();
    this.getMonths(date, function(mo) {
        var curPac = current ? current[1] : 0;
        var yearPac = curPac;
        var yearMax = 0;
        var year = date.getFullYear();
        var month = date.getMonth();
        var day = date.getDate();
        var xmin = this.date2utc(new Date(year, 1, 1)).valueOf();
        var xmax = this.date2utc(new Date(year, 12, 31)).valueOf();
        var data = new Array();
        for (var mx = (mo.length - 1); mx > 0; mx--) {
            var mo1 = mo[mx].split('|');
            var pac = parseInt(mo1[1]);
            yearPac += pac;
            if (yearMax < pac) {
                yearMax = pac;
            }
            data.push([
                this.str2date('01' + mo1[0].substr(2) + ' 00:00:00').valueOf(), 
                pac
            ]);
        }
        var mo1 = mo[0].split('|');
        var pac = parseInt(mo1[1]);
        yearPac += pac;
        if (yearMax < (pac + curPac)) {
            yearMax = pac + curPac;
        }
        data.push([
            this.str2date('01' + mo1[0].substr(2) + ' 00:00:00').valueOf(), 
            pac + curPac
        ]);
        // draw the plot
        var id = '#pv_plot_year';
        $(id).highcharts({
            chart: { 
                height: $(id).height(), 
                width: $(id).width(),
                marginRight: 50,
                marginLeft: 50,
                marginTop: 40,
            },
            plotOptions: {
                series: {
                    point: {
                        events: {
                            click: function() {
                                solarlog.render(new Date(this.x));
                                return false;
                            }
                        }
                    }
                }
            },
            series: [{
                data: data,
                type: 'column',
                name: 'Monatserträge ' + year
            }],
            xAxis: { 
                type: 'datetime',
                min: xmin,
                max: xmax,
            startOnTick: true,
            endOnTick: true
            },
            yAxis: { 
                min: 0, 
                max: 2200000,
                title: null,
            }
        });

        // output year specific values
        $('#pv_year').html(year);
        $('#pv_year_pac').html((yearPac / 1000.0).toFixed(2));
        $('#pv_year_eur').html(((yearPac / 1000.0) * (base.Verguetung / 10000.0)).toFixed(2));
        $('#pv_year_pac2').html((yearPac / base.AnlagenKWP).toFixed(2));
        $('#pv_year_max').html((yearMax / 1000.0).toFixed(2));
        var soll = 0;
        if (current) {
            var d = new Date(current[0]);
            soll = this.getSollForYear(d.getFullYear(), d.getMonth(), d.getDate(), base);
        } else {
            soll = this.getSollForYear(year, month, day, base);
        }
        $('#pv_year_soll').html(soll.toFixed(2));
        $('#pv_year_ist').html((100.0 / soll * (yearPac / 1000.0)).toFixed(1) + " %");
        this.loading(true);
    });
};

SolarLog.prototype.render = function(date) {
    this.loading();
    this.getBaseVars(function(base) {
        this.getMinCur(function(cur) {
            $('#pv_cur_pac').html(cur.Pac);
            $('#pv_cur_string1').html(cur.aPdc[0]);
            $('#pv_cur_string2').html(cur.aPdc[1]);
            if (cur.Pac > 0 && (cur.aPdc[0] > 0 || cur.aPdc[1] > 0)) { 
                $('#pv_cur_percent').html((100.0 / (cur.aPdc[0] + cur.aPdc[1]) * cur.Pac).toFixed(1) + ' %');
            } else {
                $('#pv_cur_percent').html('---');
            }
            $('#pv_cur_status').html(base.StatusCodes[0].split(',')[cur.curStatusCode[0]]);
            $('#pv_cur_error').html(base.FehlerCodes[0].split(',')[cur.curFehlerCode[0]]);

            var modified = this.str2date(cur.Datum + ' ' + cur.Uhrzeit);
            var isCurrentYear = !date || date.getFullYear() == modified.getFullYear();
            var isCurrentMonth = !date || (isCurrentYear && date.getMonth() == modified.getMonth()); 

            if (!date || date >= modified || (isCurrentMonth && date.getDate() == modified.getDate())) {
                date = modified;
            }

            var yearChanged = !this.date || date.getFullYear() != this.date.getFullYear();
            var monthChanged = !this.date || yearChanged || date.getMonth() != this.date.getMonth();
            var dayChanged = !this.date || monthChanged || date.getDate() != this.date.getDate();

            if (dayChanged) {
                this.renderDay(date, base, date == modified);
                this.getCurrent(function(current) {
                    if (monthChanged) this.renderMonth(date, base, isCurrentMonth ? current : null);
                    if (yearChanged) this.renderYear(date, base, isCurrentYear ? current : null);
                });
            }

            this.date = date;
            this.loading(true);
        });
    });
};
