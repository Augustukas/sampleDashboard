/**
 */
/*jshint -W072*/
(function () {
    'use strict';
    angular.module('app')
        .controller('DashboardDataController', DashboardDataController);

    DashboardDataController.$inject = ['$stateParams', 'plantList', 'DataAggregationService', 'PlantSelected',
        'dashboardData', 'MonthService', 'kpiGroups', 'CarolUIHelper', '$scope', '$filter', '$state', 'MonthSelected'];

    function DashboardDataController($stateParams, plantList, DataAggregationService, PlantSelected,
                                     dashboardData, MonthService, kpiGroups, CarolUIHelper, $scope, $filter, $state, MonthSelected) {
        var vm = this;
        vm.months = {};
        vm.kpiGroups = kpiGroups;
        vm.dashboardData = dashboardData.data;
        vm.plantList = plantList.data;
        vm.plantSelected = {};
        vm.yearSelected = $stateParams.year;
        vm.regionSelectedId = $stateParams.regionId;
        vm.plantTypeSelectedId = $stateParams.plantTypeId;
        vm.cbuTypeId = $stateParams.cbuTypeId;
        vm.getMonthTarget = getMonthTarget;
        vm.getYtdActual = getYtdActual;
        vm.cleanKpiName = cleanKpiName;
        vm.getLinkUrl = getLinkUrl;
        vm.getYtdTarget = getYtdTarget;
        vm.getBackgroundColor = getBackgroundColor;
        vm.getFinalSingleMonthValue = getFinalSingleMonthValue;
        vm.numberFormating = CarolUIHelper.numberFormating;
        vm.findInArray = DataAggregationService.findNeedleInObjectArray;
        vm.filterKpiGroup = filterKpiGroup;
        vm.chartDefaultValues = {
            labels: ['10', '11', '12', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            datasets: [{
                type: 'bar',
                label: 'KPI',
                backgroundColor: [
                    'rgba(28, 182, 90, 0.72 )',
                    'rgba(28, 182, 90, 0.72 )',
                    'rgba(28, 182, 90, 0.72 )',
                    'rgba(28, 182, 90, 0.72 )',
                    'rgba(28, 182, 90, 0.72 )',
                    'rgba(28, 182, 90, 0.72 )',
                    'rgba(28, 182, 90, 0.72 )',
                    'rgba(28, 182, 90, 0.72 )',
                    'rgba(28, 182, 90, 0.72 )',
                    'rgba(28, 182, 90, 0.72 )',
                    'rgba(28, 182, 90, 0.72 )',
                    'rgba(28, 182, 90, 0.72 )'
                ],
                data: [120, 25, 68, 45, 70, 80, 4, 89, 65, 12, 23, 45],
                borderColor: 'white',
                borderWidth: 2
            }, {
                type: 'line',
                label: 'Target',
                fill: false,
                tension: 0,
                backgroundColor: 'blue',
                data: [92, 32, 49, 55, 77, 88, 15, 67, 54, 12, 23, 45],
                borderColor: 'blue',
                borderWidth: 2
            }]
        };
        Chart.defaults.global.legend.display = false;
        Chart.defaults.global.animation.duration = 0;
        Chart.defaults.global.elements.line.borderWidth = 1;

        init();

        $scope.$on('broadcastEvent_' + $state.current.name, function(a, filter) {
            if (filter.yearSelected) {
                MonthService.setYear(filter.yearSelected);
                vm.allMonths = MonthService.getMonthsIndexed();
            }
            MonthSelected.setMonthSelected(vm.allMonths.filter(function (month) {
                return month.monthNr === parseInt(filter.monthSelected.index || 10, 10);
            })[0]);

            $scope.Model.monthSelected = MonthSelected.getMonthSelected();
            vm.monthSelected = MonthSelected.getMonthSelected();
            if (filter.yearSelected && (filter.plantSelected || filter.plantTypeSelected || filter.regionSelected || filter.cbuSelected)) {
                vm.monthSelected = filter.monthSelected;
                $state.go('dashboard.data', {
                    plantId: filter.plantSelected ? filter.plantSelected.id : 0,
                    year: filter.yearSelected,
                    plantTypeId: filter.plantTypeSelected ? filter.plantTypeSelected.id : 0,
                    regionId: filter.regionSelected ? filter.regionSelected.id : 0,
                    cbuTypeId: filter.cbuSelected ? filter.cbuSelected.id : 0,
                    templateId: filter.dashboardTemplateSelected ? filter.dashboardTemplateSelected.id : 0
                });
            }

        });

        function filterKpiGroup(group) {
            var filteredList = [];
            for (var singleKpi in vm.dashboardData) {
                if (vm.dashboardData.hasOwnProperty(singleKpi)) {
                    if (vm.dashboardData[singleKpi].kpi.kpiGroupId === group.id) {
                        filteredList.push(vm.dashboardData[singleKpi]);
                    }
                }
            }
            return filteredList;
        }
        function cleanKpiName(kpiName) {
            return kpiName.replace(/ /g, '&nbsp;');
        }

        function getLinkUrl(kpi) {
            if (PlantSelected.getPlantSelected() && PlantSelected.getPlantSelected().id && kpi.ratioId && vm.yearSelected) {
                return $state.href('plant', {
                    plantId: PlantSelected.getPlantSelected().id,
                    kpiID: kpi.ratioId,
                    year: vm.yearSelected});
            } else {
                return $state.href('aggregate.kpidata', {
                    kpiID: kpi.ratioId,
                    year: vm.yearSelected,
                    fysMonth: 10,
                    regionId: vm.regionSelectedId ? vm.regionSelectedId : 0,
                    plantTypeId: vm.plantTypeSelectedId ? vm.plantTypeSelectedId : 0,
                    cbuTypeId: vm.cbuTypeId ? vm.cbuTypeId : 0});
            }

        }

        function init() {
            MonthService.setYear($stateParams.year);
            vm.months = MonthService.getMonthsIndexed();
            MonthSelected.setMonthSelected(vm.months.filter(function (month) {
                return month.monthNr === $scope.Model.monthSelected.monthNr;
            })[0]);
            extractKpiValues(vm.dashboardData);
            PlantSelected.setPlantSelected(DataAggregationService.findNeedleInObjectArray('id', $stateParams.plantId, vm.plantList));
            vm.plantSelected = PlantSelected.getPlantSelected();
        }

        function getBackgroundColor(monthSelected, singleKpi, YTDdata) {
            var value;
            var target;
            var classToReturn = 'bg-success';
            var dontFilter = true;
            if (YTDdata) {
                value = getYtdActual(monthSelected.monthNr, singleKpi, dontFilter);
                target = getYtdTarget(monthSelected.monthNr, singleKpi, dontFilter);
            } else {
                value = getFinalSingleMonthValue(monthSelected.writeDate, singleKpi.finalResults, singleKpi.kpi.decimalPlace, dontFilter);
                target = getMonthTarget(monthSelected.monthNr, singleKpi.targets, singleKpi.kpi.decimalPlace, dontFilter);
            }

            if (singleKpi.kpi.targetDirection && singleKpi.kpi.targetDirection === '>') {
                classToReturn = value >= target ? 'bg-success' : 'bg-danger';
            } else {
                classToReturn = value <= target ? 'bg-success' : 'bg-danger';
            }

            if (target == null) {
                //if target not present assume  value is ok
                classToReturn = 'bg-success';
            }
            return classToReturn;
        }

        function getFinalSingleMonthValue(writeDate, finalResults, decimalPlace, dontFilter) {
            var value2 = vm.findInArray('writeDate', writeDate, finalResults);
            var value = null;
            if (value2) {
                value = value2.value;
            }
            //value = vm.findInArray('writeDate', writeDate, finalResults).value;
            if (!dontFilter) {
                value = $filter('numeraljs')(value, vm.numberFormating(decimalPlace));
            }
            return value;
        }

        function getMonthTarget(monthSelectedIndex, targets, decimalPlace, dontFilter) {
            var month = vm.months.filter(function(month) {
                return month.monthNr === monthSelectedIndex;
            })[0];
            var target = targets.target[vm.months.indexOf(month)];
            if (!dontFilter) {
                target = $filter('numeraljs')(target, vm.numberFormating(decimalPlace));
            }
            return target;
        }

        function getYtdActual(monthSelected, singleKpi, dontFilter) {
            var tillMonthIncluding = MonthService.getMonthByIndex(parseInt(monthSelected));
            var value = null;
            var valueArray = [];

            angular.forEach(singleKpi.finalResults, function (value, key) {
                if (value.writeDate <= tillMonthIncluding.writeDate) {
                    valueArray.push(value.value);
                }
            });

            if (valueArray.length > 0) {
                value = DataAggregationService.aggrSwitch(singleKpi.kpi.timeAggMethod, value, valueArray);
                if (!dontFilter) {
                    value = $filter('numeraljs')(value, vm.numberFormating(singleKpi.kpi.decimalPlace));
                }
            }
            return value;
        }

        function getYtdTarget(monthSelected, singleKpi, dontFilter) {

            var tillMonthIncluding = MonthService.getMonthByIndex(parseInt(monthSelected));
            var target = null;
            var valueArray = [];

            angular.forEach(singleKpi.targets.target, function (value, key) {
                if (vm.months[key].writeDate <= tillMonthIncluding.writeDate && value !== null && value !== undefined) {
                    valueArray.push(value);
                }
            });

            if (valueArray.length > 0) {
                target = DataAggregationService.aggrSwitch(singleKpi.kpi.timeAggMethod, target, valueArray);
                if (!dontFilter) {
                    target = $filter('numeraljs')(target, vm.numberFormating(singleKpi.kpi.decimalPlace));
                }
            }

            return target;
        }

        function extractKpiValues(dashboardData) {
            // return clean array
            for (var singleKpi in dashboardData) { // http://stackoverflow.com/questions/1963102/what-does-the-jslint-error-body-of-a-for-in-should-be-wrapped-in-an-if-statemen
                if (dashboardData.hasOwnProperty(singleKpi)) {
                    var data = [];

                    MonthService.getMonthsIndexed().forEach(function (month) {
                        var kpiPropValue = DataAggregationService.findNeedleInObjectArray('writeDate', month.writeDate, dashboardData[singleKpi].finalResults);

                        if (kpiPropValue) {
                            data.push(rounding(kpiPropValue.value, dashboardData[singleKpi].kpi.decimalPlace));

                        } else {
                            data.push(0);
                        }
                    });
                    dashboardData[singleKpi].kpiName = dashboardData[singleKpi].kpi.ratioName;

                    dashboardData[singleKpi].chartBarData = data;

                    dashboardData[singleKpi].id = dashboardData[singleKpi].kpi.ratioId;

                    var carlineTargetCount = Object.keys(dashboardData[singleKpi].targets['carlineTargets']);
                    if (dashboardData[singleKpi].kpi['carlineBased'] && carlineTargetCount.length > 0) {
                        //TODO for now take first carlines data
                        dashboardData[singleKpi].targetData = dashboardData[singleKpi].targets.carlineTargets[carlineTargetCount[0]].target;
                    } else {
                        dashboardData[singleKpi].targetData = dashboardData[singleKpi].targets.target;
                    }

                    dashboardData[singleKpi].barColors = updateColors(dashboardData[singleKpi].targetData,
                        dashboardData[singleKpi].chartBarData,
                        dashboardData[singleKpi].kpi.targetDirection);

                }
            }
        }

        function rounding(number, decimalPlace) {

            var d = Math.pow(10, decimalPlace);
            return Math.round(number * d) / d;
        }

        // TODO duplicate code make as service
        function updateColors(targets, kpi, targetDirection) {

            var less = targetDirection === '<';

            var good = 'rgba(28, 182, 90, 0.72 )';
            var medium = 'rgba(231, 227, 13, 0.72)';
            var bad = 'rgba(209, 36, 36, 0.72)';

            var colorArray = [];

            if (less) {
                targets.forEach(function (target, index) {

                    if (target != null && kpi[index] != null) {

                        colorArray.push(kpi[index] > target ? bad : good);
                    }
                    else {
                        colorArray.push(good);
                    }

                });
            }
            else {
                targets.forEach(function (target, index) {

                    if (target !== null && kpi[index] !== null) {

                        colorArray.push(kpi[index] < target ? bad : good);
                    }
                    else {
                        colorArray.push(good);
                    }

                });
            }

            return colorArray;
        }

    }
})();
