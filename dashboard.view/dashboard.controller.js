/**
 */
/*jshint -W072*/
/*jshint -W074*/
(function () {
    'use strict';
    angular
        .module('app')
        .controller('DashboardController', DashboardController);

    DashboardController.$inject = ['plantList', 'plantTypeList', '$state', 'PlantSelected', 'regionList', 'YearsService',
        'cbuPlantsList', 'MonthService', 'MonthSelected', '$scope', 'ProductGroupSelected', 'RegionSelected', 'CbuSelected', 'CarolUIHelper', 'DataService', '$window'];

    function DashboardController(plantList, plantTypeList, $state, PlantSelected, regionList, YearsService,
                                 cbuPlantsList, MonthService, MonthSelected, $scope, ProductGroupSelected, RegionSelected, CbuSelected, CarolUIHelper, DataService, $window) {
        var vm = this;
        //we have two monthSelected, one on scope is used in child controller for two way data binding.
        $scope.Model = {monthSelected: MonthSelected.getMonthSelected()};
        vm.monthSelected = MonthSelected.getMonthSelected();
        vm.yearSelected = '';
        vm.regionSelected = {};
        vm.plantTypeSelected = {};
        vm.cbuSelected = {};
        vm.updateData = updateData;
        vm.initSelections = initSelections;
        vm.plantList = plantList.data;
        vm.regionList = regionList.data;
        vm.plantTypeList = plantTypeList.data;
        vm.cbuPlantsList = cbuPlantsList.data;
        vm.years = YearsService.getYears();
        vm.allMonths = [];

        vm.dashboardTemplateSelected = '';
        vm.dashboardTemplateList = [];
        init();

        //=====================================================

        $scope.$on('broadcastEvent_' + $state.current.name, function(a, filter) {

            if (filter.yearSelected && (filter.plantSelected || filter.plantTypeSelected || filter.regionSelected || filter.cbuSelected)) {

                if (filter.yearSelected) {
                    MonthService.setYear(filter.yearSelected);
                    vm.allMonths = MonthService.getMonthsIndexed();
                }
                MonthSelected.setMonthSelected(vm.allMonths.filter(function (month) {
                    return month.monthNr === parseInt(filter.monthSelected.index || 10, 10);
                })[0]);

                $scope.Model.monthSelected = MonthSelected.getMonthSelected();
                vm.monthSelected = MonthSelected.getMonthSelected();
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

        //=====================================================

        $scope.$on('updateSelectedTemplate', function (a, data) {

            DataService.getPersonalTemplateList().then(function(resp) {
                    vm.dashboardTemplateList = [];
                    vm.dashboardTemplateList = resp.data;

                    vm.dashboardTemplateSelected = vm.dashboardTemplateList.filter(function(item) {
                        return item.active;
                    })[0];

                    vm.updateData();
                });
        });

        $scope.$on('updateOnEditSelectedTemplate', function (a, data) {
            //TODO 2. laikinas sprendimas, vietoj to reik perkrauti lenteles data. Esant tiem patiems routo parametrams state.go niekur kitur nenaviguoja(steitas nepasikeite)
            $window.location.reload();

        });

        function init() {
            if (vm.yearSelected) {
                MonthService.setYear(vm.yearSelected);
            }
            vm.allMonths = MonthService.getMonthsIndexed();
            PlantSelected.reset();
            ProductGroupSelected.reset();

            DataService.getPersonalTemplateList().then(function(resp) {
                vm.dashboardTemplateList = resp.data;
                vm.dashboardTemplateSelected = vm.dashboardTemplateList.filter(function(item) {
                    return item.active;
                })[0];
            });
        }

        function updateData() {
            if (vm.yearSelected) {
                MonthService.setYear(vm.yearSelected);
                vm.allMonths = MonthService.getMonthsIndexed();
            }
            MonthSelected.setMonthSelected(vm.allMonths.filter(function (month) {
                return month.monthNr === vm.monthSelected.monthNr;
            })[0]);

            $scope.Model.monthSelected = MonthSelected.getMonthSelected();
            vm.monthSelected = MonthSelected.getMonthSelected();

            CarolUIHelper.updateFilters(vm);

            if (vm.plantSelected && vm.plantSelected.id > 0) {
                vm.regionSelected = regionList.data.filter(function (region) {
                    return region.id === PlantSelected.getPlantSelected().regionId;
                })[0];

                vm.plantTypeSelected = plantTypeList.data.filter(function (item) {
                    return item.id === PlantSelected.getPlantSelected().plantTypeID;
                })[0];
            }

            if (vm.yearSelected && (vm.plantSelected || vm.plantTypeSelected || vm.regionSelected || vm.cbuSelected)) {

                $state.go('dashboard.data', {
                    plantId: vm.plantSelected ? vm.plantSelected.id : 0,
                    year: vm.yearSelected,
                    plantTypeId: vm.plantTypeSelected ? vm.plantTypeSelected.id : 0,
                    regionId: vm.regionSelected ? vm.regionSelected.id : 0,
                    cbuTypeId: vm.cbuSelected ? vm.cbuSelected.cbuId : 0,
                    templateId: vm.dashboardTemplateSelected ? vm.dashboardTemplateSelected.id : 0
                });
            }

        }

        function initSelections(stateParams) {
            //MonthSelected.getMonthSelected().index
            vm.yearSelected = stateParams.year;
            MonthService.setYear(vm.yearSelected);
            vm.allMonths = MonthService.getMonthsIndexed();
            vm.monthSelected = vm.allMonths.filter(function (month) {
                return month.monthNr === MonthSelected.getMonthSelected().monthNr;
            })[0];

            if (stateParams.plantId || stateParams.plantId > 0) {
                // if plant id is present in params set new plant. Else set empty. so plantselected would be reset on state change.
                PlantSelected.setPlantSelected(plantList.data.filter(function (plant) {
                    return plant.id === stateParams.plantId;
                })[0]);
                vm.plantSelected = PlantSelected.getPlantSelected();
            }

            vm.regionSelected = regionList.data.filter(function (region) {
                return region.id === stateParams.regionId;
            })[0];

            vm.plantTypeSelected = plantTypeList.data.filter(function (item) {
                return item.id === stateParams.plantTypeId;
            })[0];

            vm.cbuSelected = cbuPlantsList.data.filter(function (item) {
                return item.cbuId === stateParams.cbuTypeId;
            })[0];

        }
    }
})();
