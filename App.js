Ext.define('CustomApp', {
	extend: 'Rally.app.App',
	componentCls: 'app',


	_colors: {
		onTrack: '#CADDA3',
		somethingNotFinished: '#BDD7EA',
		doneAndDone: '#7CAFD7',
		defaultColor: '#8DC63F',
		late: '#ff7755',
		atRisk:'#F2D3D0'
	},
	_series: [{
		name: 'Releases',
		data: [
		{ name: 'Release1', y: 10 },
		{ name: 'Relase 2', y: 25 },
		{ name: 'Release 3', y:4, color: 'red' }
		]
	}],


	_getChartData: function() {
		return {
			categories: this._categories,
			series: this._series
		};
	},
	_getChartConfig: function() {
		return {
			chart: {
				type: 'column'
			},
			legend: { enabled: false },
			title: {
				text: 'Releases'
			},
			xAxis: {
				type: 'datetime',
				startOnTick: false,
				min: new Date(this._selectedFeature.PlannedStartDate).getTime() ,
				plotBands: [{ // mark the weekend
					color: '#FdFFd5',
					// label: {text:"Feature Planned Start and End"},
					from: new Date(this._selectedFeature.PlannedStartDate).getTime(),
					to: new Date(this._selectedFeature.PlannedEndDate).getTime()
				}],
				dateTimeLabelFormats : {
					hour: '%Y-%m-%d',
					day: '%Y-%m-%d',
					week: '%Y-%m-%d',
					month: '%Y-%m',
					year: '%Y'
				}
			},
			yAxis: {
				allowDecimals:false,
				min: 0,
				minTickInterval:1,
				title: {
					text: 'Release Size (in Points)'
				}
			},
			tooltip: {
				formatter: function() {
					if (this.y === 0) {
						return false;
					}

					var c = this.point.completedStoryCount;
					var i = this.point.incompleteStoryCount;
					var t = this.point.totalDaysInRelease;
					var d = this.point.currentReleaseDays;
					var html = "Points (Complete/Incomplete) = (" + c + "/" + i + ")<br/>";
					html += "Days in Release (Total/Left) = (" + t + "/" + (t-d) + ")<br/>";
					html += this.point.prognosis;

					return html;
				}
				// headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
				// pointFormat: '<tr>' +
				// '<td style="padding:0"><b>{point.y} points</b></td></tr><tr><td>Prognosis : {point.prognosis}</td></tr>',
				// footerFormat: '</table>',
				// shared: true,
				// useHTML: true
			},
			plotOptions: {
				column: {
					pointWidth:20,
					dataLabels: {
						enabled: true,
						rotation: -90,
						align:'left',
						formatter: function() {
							return this.point.name;
						}
					}
				}
			}
		};
	},
	CalculateRisk: function(TotalStoryCount, CompletedStoryCount, Totalduration, Dayspast) {
		var PercentComplete = (CompletedStoryCount / TotalStoryCount) * 100;
		var TimeElapsedPercentage = (Dayspast / Totalduration) * 100;
		var AtRisk = 0;

		if ((TimeElapsedPercentage - PercentComplete) > 20) {
			AtRisk = 2;
		}
		else if ((TimeElapsedPercentage - PercentComplete) > 5) {
			AtRisk = 1;
		}
		else {
			AtRisk = 0;
		}

		return AtRisk;
	},


	daysBetween: function(start, end) {
		start = new Date(start);
		end = new Date(end);
		var days = 0;
		while (start.getTime() < end.getTime()) {
			days++;
			start.setDate(start.getDate() + 1);
		}
		days++;
		return days;
	},
	monthsBetween: function(start, end) {
		start = new Date(start);
		end = new Date(end);
		var months = 0;
		while (start.getTime() < end.getTime()) {
			months++;
			start.setMonth(start.getMonth() + 1);
		}
		months++;
		return months;
	},

	launch: function() {


		var c = this.add({
			xtype:'panel',
			layout: {
				type:'hbox',
				padding:3
			}
		});
		this._featureComboBox = c.add({
			xtype: 'rallycombobox',
			fieldLabel: 'Feature',
			width:400,
			value:null,
			displayTpl: '<tpl for="."><tpl if="this.isEmpty(Name)"><tpl else>{FormattedID} - {Name}</tpl></tpl>',
			listConfig : {
				getInnerTpl : function() {
					return '<div class="x-combo-list-item"><div id="left">{FormattedID} - {Name}</div></div>';
				}
			},
			persistent:true,
			storeConfig: {
				autoLoad: true,
				model: 'PortfolioItem/Feature',
				remoteFilter: true
			}
		});
		c.add({
			xtype:'container',
			width:100
		});

		var html = "<div style='float:right;'>";
		html += "<span style='padding:15px;background-color:" + this._colors.onTrack + "'>On Track</span>";
		html += "<span style='padding:15px;background-color:" + this._colors.late + "'>Late</span>";
		html += "<span style='padding:15px;background-color:" + this._colors.atRisk + "'>At Risk</span>";
		html += "<span style='padding:15px;background-color:" + this._colors.somethingNotFinished + "'>Something is Unfinished</span>";
		html += "<span style='padding:15px;background-color:" + this._colors.doneAndDone + "'>Done</span>";
		html += "</div>";

		c.add({
			html: html,
			xtype: "panel",
			style: {
				'float':'right'
			}
		});

		this._featureComboBox.on('select', this._onFeatureChanged, this);
		this._featureComboBox.on('ready', function(combo,opts) {combo.setValue(null);}, this);

	},

	_onFeatureChanged: function(combo, records, eOpts) {
		if (!records || records.length === 0) {
			return;
		}
		var selectedFeature = records[0].data;
		this._selectedFeature = selectedFeature;

		if (this._chart) {
			this.remove(this._chart);
			this._chart = null;
		}

		this._loadStories(selectedFeature);

	},


	_calculateCategories: function(selectedFeature) {
		var chartStartDate = null;
		if (selectedFeature.PlannedStartDate && selectedFeature.ActualStartDate) {
			var ps = new Date(selectedFeature.PlannedStartDate);
			var as = new Date(selectedFeature.ActualStartDate);
			chartStartDate = (ps.getTime() < as.getTime()) ? ps : as;
		} else if (selectedFeature.PlannedStartDate) {
			chartStartDate = new Date(selectedFeature.PlannedStartDate);
		} else if (selectedFeature.ActualStartDate) {
			chartStartDate = new Date(selectedFeature.ActualStartDate);
		} else {
			console.log("Yikes #1"); return;
		}

		var chartEndDate = null;

		if (selectedFeature.PlannedEndDate && selectedFeature.ActualEndDate) {
			var pe = new Date(selectedFeature.PlannedEndDate);
			var ae = new Date(selectedFeature.ActualEndDate);
			chartEndDate = (pe.getTime() > ae.getTime()) ? pe : ae;
		} else if (selectedFeature.PlannedEndDate) {
			chartEndDate = new Date(selectedFeature.PlannedEndDate);
		} else if (selectedFeature.ActualEndDate) {
			chartEndDate = new Date(selectedFeature.ActualEndDate);
		} else {
			console.log("Yikes #2"); return;
		}
		return this.months(chartStartDate, chartEndDate);

	},

	months: function(date1, date2) {
		var results = [];
		while (date1.getTime() < date2.getTime()) {
			results.push((1900 + date1.getYear()) + '-' + (date1.getMonth() + 1));
			date1.setMonth(date1.getMonth() + 1);
		}
		results.push((1900 + date1.getYear()) + '-' + (date1.getMonth() + 1));
		return results;
	},

	_expandReleaseInfo: function(releaseRows) {

		var releaseOids = _.chain(releaseRows).pluck('ObjectID').unique().value();


		var filter = Ext.create('Rally.data.wsapi.Filter', {
			property: 'ObjectID',
			operator: '=',
			value: 0
		});
		_.each(releaseOids, function(releaseOid) {
			filter = filter.or({
				property: 'Release.ObjectID',
				operator: '=',
				value: releaseOid
			});
		});
		Ext.create('Rally.data.wsapi.Store', {
			model: 'HierarchicalRequirement',
			filters: [
			filter
			],
			limit: Infinity,
			autoLoad: true,
			listeners: {
				load: function(store, userStories) {
					var storiesByRelease = _.chain(userStories).pluck('data').groupBy(function(x) { return x.Release.ObjectID; }).value();
					_.each(releaseRows, function(release) {
						release.TotalStoryCount = storiesByRelease[release.ObjectID].length;

						var completedStories = _.filter(storiesByRelease[release.ObjectID], function(r) { return r.ScheduleState === 'Accepted' || r.ScheduleState === 'Released'; });
						release.CompletedStoryCount = completedStories.length;
						release.IncompleteStoryCount = release.TotalStoryCount - release.CompletedStoryCount;

						// console.log("Total Story Count is ", release.TotalStoryCount);
						// console.log("Incomplete Story Count is ", release.IncompleteStoryCount);
					});
					this._refreshChart(releaseRows);
				},
				scope: this
			}
		});
	},

	_colorByCountComplete: function(release) {
		var complete = release.TotalStoryCount || 0;
		var incomplete = release.IncompleteStoryCount || 0;
		var now = new Date();
		var releaseDate = new Date(release.ReleaseDate);
		var releaseStart = new Date(release.ReleaseStartDate);

		if (now.getTime() > releaseDate.getTime() && incomplete > 0) {
			// we are passed the release date and there are incomplete stories
			release.Prognosis = 'Something wasn\'t finished';
			return this._colors.somethingNotFinished; // light blue
		}
		if (now.getTime() > releaseDate.getTime()) {
			// we are passed the release date and there are incomplete stories
			release.Prognosis = 'Done';
			return this._colors.doneAndDone; // blue
		}

		// release will start in the future.
		if (now.getTime() < releaseStart.getTime()) {
			release.Prognosis = 'On Track';
			return this._colors.onTrack; // green
		}

		totalDaysInRelease = this.daysBetween(releaseStart, releaseDate);
		currentReleaseDays = this.daysBetween(releaseStart, new Date());

		release.TotalDaysInRelease = totalDaysInRelease;
		release.CurrentReleaseDays = currentReleaseDays;

		var riskLevel = this.CalculateRisk(release.TotalStoryCount, release.CompletedStoryCount, totalDaysInRelease, currentReleaseDays);

		if (riskLevel === 0) {
			release.Prognosis = 'On Track';
			return this._colors.onTrack;
		} else if (riskLevel == 1) {
			release.Prognosis = 'At Risk';
			return this._colors.atRisk;
		} else {
			release.Prognosis = 'Late';
			return this._colors.late;
		}
	},

	_refreshChart: function(releaseRows) {
		var self = this;
		// build an array of data series
		// {name:'Release 3',y:4,color:'red',x:<date value>}
		var seriesData=[];

		seriesData = seriesData.concat(_.map(releaseRows, function(release) {
			return {
				x: new Date(release.ReleaseDate).getTime(),
				y: release.TotalStoryCount ? release.TotalStoryCount : 1,
				name: release.Name,
				color: release.TotalStoryCount ? self._colorByCountComplete(release) : 'blue',
				prognosis: release.Prognosis,
				completedStoryCount: release.CompletedStoryCount,
				incompleteStoryCount: release.IncompleteStoryCount,
				totalDaysInRelease: release.TotalDaysInRelease,
				currentReleaseDays: currentReleaseDays

			};
		}));

		seriesData.push({
			x: new Date(this._selectedFeature.PlannedStartDate).getTime(),
			y:0,
			name:' Feature Start',
			tooltip: {
				enabled:false
			}
		});
		seriesData.push({
			x: new Date(this._selectedFeature.PlannedEndDate).getTime(),
			y:0,
			name:' Feature End',
			tooltip: {
				enabled:false
			}
		});
		seriesData = _.sortBy(seriesData, 'x');
		// console.table(seriesData);
		this._series = [{
			name: 'Releases',
			data: seriesData
		}];


		// console.table(this._series.data);
		if (this._chart) {
			this.remove(this._chart);
			this._chart = null;
		}

		var cc = this._getChartConfig();
		// console.log("Chart Config",cc);
		var cd = this._getChartData();

		this._chart = this.add({
			xtype: 'rallychart',
			loadMask: false,
			chartData: cd,
			chartConfig: cc
		});

	},

	_loadReleases: function(releaseOids) {
		// this initial filter could be better
		var filter = Ext.create('Rally.data.wsapi.Filter', {
			property: 'Name',
			operator: '=',
			value: 'SOMETHINGTHATDOESNTEXIST'
		});
		_.each(releaseOids, function(releaseOid) {
			filter = filter.or({
				property: 'ObjectID',
				operator: '=',
				value: releaseOid
			});
		});
		Ext.create('Rally.data.wsapi.Store', {
			model: 'Release',
			filters: [
			filter
			],
			// context: this.getContext().getDataContext(),
			// fetch: ['Release'],
			limit: Infinity,
			autoLoad: true,
			listeners: {
				load: function(store, records) {
					var filtered = _.filter(records, function(r) {
						return r.data.Name != 'Spikes or unsure of release' && r.data.Name != 'Not in a release';
					});
					var releases = _.pluck(filtered, 'data');
					// this._refreshChart(releases);
					this._expandReleaseInfo(releases);

				},
				scope: this
			}
		});
	},

	_loadStories: function(feature) {

		Ext.create('Rally.data.wsapi.Store', {
			model: 'UserStory',
			filters: [
			{
				property: 'Feature.ObjectID',
				operator: '=',
				value: feature.ObjectID
			},
			{
				property: 'Release.Name',
				operator: '!=',
				value: null
			}
			],
			// context: this.getContext().getDataContext(),
			fetch: ['Release'],
			limit: Infinity,
			autoLoad: true,
			listeners: {
				load: function(store, records) {
					var releaseRefs = _.chain(records).pluck('data').pluck('Release').pluck('_ref').map(function(x) { return x.split(/\//)[2]; }).unique().value();
					this._loadReleases(releaseRefs);
				},
				scope: this
			}
		});
	}

});
