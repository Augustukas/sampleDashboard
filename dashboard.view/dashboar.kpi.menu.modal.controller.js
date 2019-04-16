/**
 */

(function () {
    'use strict';

    angular
        .module('app')
        .controller('DashboardKpiMenuModalController', DashboardKpiMenuModalController)
        .controller('DashboardModalInstanceCtrl', function ($scope, $uibModalInstance, dataService, kpiList, excludedKpiIds,
                                                            personalTemplateItems, templateTypeList, toastr, $rootScope) {

            $scope.templateName = '';
            $scope.type = [];

            $scope.personalTemplateItems = personalTemplateItems;
            $scope.templateTypeList = templateTypeList;

            $scope.kpiList = kpiList;

            $scope.templateTypeSelected = '';

            $scope.makeActive = makeActive;
            $scope.makeInactive = makeInactive;
            $scope.showSelection = showSelection;
            $scope.populateListSelect = populateListSelect;

            $scope.createNewTemplate = createNewTemplate;

            $scope.idSelectedElement = null;
            $scope.setSelected = function (idSelectedElement) {
                $scope.idSelectedElement = idSelectedElement;
            };

            $scope.isHidedCreateNewButton = false;
            $scope.isVisibleTemplateInput = false;
            $scope.isKpiSelectorDisabled = true;
            $scope.isVisibleSaveButton = false;
            $scope.isVisibleEditButton = false;

            init();

            function init() {

                $scope.availableList = [{}];
                $scope.selectedList = [];
                $scope.populateListSelect(excludedKpiIds);

                $scope.personalTemplateItems.filter(function (element) {
                    if (element.active) {
                        $scope.showSelection(element);
                    }
                });

            }

            function populateListSelect(excludeIds) {
                $scope.kpiList.forEach(function (item) {

                    if ($.inArray(item.id, excludeIds) >=  0) {
                        $scope.selectedList.push(item);
                    }
                    else {
                        $scope.availableList.push(item);
                    }
                });
            }

            function makeActive(item) {
                $scope.personalTemplateItems.filter(function (element) {
                    if (element.active) {
                        element.active = false;
                    }
                });

                item.active = true;
                $scope.showSelection(item);
                dataService.setActiveTemplate(item)
                    .then(function (resp) {
                            // success
                            $rootScope.$broadcast('updateSelectedTemplate');
                        },
                        function (resp) {
                            // error
                            toastr.error('Error occurred');
                        });
            }

            function makeInactive(item) {
                item.active = false;
                dataService.makeInactiveTemplate()
                    .then(function (resp) {
                            // success
                            $rootScope.$broadcast('updateSelectedTemplate');
                        },
                        function (resp) {
                            // error
                            toastr.error('Error occurred');
                        });
            }

            function showSelection(item) {
                $scope.availableList = [{}];
                $scope.selectedList = [];

                $scope.populateListSelect(item.excludedKpiIdList);
            }

            function createNewTemplate() {
                $scope.isHidedCreateNewButton = true;
                $scope.isVisibleTemplateInput = true;
                $scope.isKpiSelectorDisabled = false;
                $scope.isVisibleSaveButton = true;

                $scope.availableList = [];

                $scope.selectedList = angular.copy($scope.kpiList);

                $scope.templateName = '';

            }

            $scope.submit = function () {

                if ($scope.templateName === '') {
                    toastr.error('Template name required !');
                    return;
                }

                if ($scope.selectedList.length === 0) {
                    toastr.error('Select at least a single kpi to hide !');
                    return;
                }

                $scope.isHidedCreateNewButton = false;
                $scope.isVisibleTemplateInput = false;
                $scope.isKpiSelectorDisabled = true;
                $scope.isVisibleSaveButton = false;

                // $uibModalInstance.close($scope.selected.item);

                var type = 'personal';
                var ids = [];
                $scope.availableList = [{}];

                $scope.selectedList.forEach(function (item) {
                    ids.push(item.id);
                });
                dataService.saveExcludedKpiIds(ids, $scope.templateName, type).then(
                    function (resp) {
                        console.log(resp.data);

                        dataService.getPersonalTemplateList()
                            .then(function (resp) {
                                toastr.success('Successfully saved: ' + $scope.templateName);

                                $scope.personalTemplateItems = resp.data;
                                $scope.templateName = '';
                                $rootScope.$broadcast('updateSelectedTemplate');
                            });
                    },
                    function (resp) {
                        toastr.error('Error occurred');
                    }
                );

            };

            $scope.cancelSave = function () {

                $scope.isHidedCreateNewButton = false;
                $scope.isVisibleTemplateInput = false;
                $scope.isKpiSelectorDisabled = true;
                $scope.isVisibleSaveButton = false;
            };

            $scope.deleteSelectedTemplate = function () {

                if ($scope.idSelectedElement === null) {
                    toastr.error('Please select template from personal template list !');
                    return;
                }

                var elementToDelete = $scope.personalTemplateItems.filter(function (item) {
                    if (item.id === $scope.idSelectedElement) {
                        return true;
                    }
                })[0];

                if (elementToDelete === undefined) {
                    toastr.error('Error !');
                    return;
                }

                if (elementToDelete.active) {
                    $scope.makeInactive(elementToDelete);
                }

                dataService.deletePersonalTemplate(elementToDelete)
                    .then(function (resp) {
                            toastr.success('Successfully deleted: ' + elementToDelete.templateName);
                            $scope.personalTemplateItems = [];
                            dataService.getPersonalTemplateList()
                                .then(function (resp) {
                                    $scope.personalTemplateItems = resp.data;
                                    $scope.templateName = '';
                                });
                        },
                        function (resp) {
                            toastr.error('Error');

                        });
            };



            $scope.makeEditMode = function(){
                if ($scope.idSelectedElement === null) {
                    toastr.error('Please select template from personal template list !');
                    return;
                }
                $scope.isKpiSelectorDisabled = false;
                $scope.isVisibleEditButton = true;

            };



            $scope.editSelectedTemplate = function(){

                var ids = [];
                $scope.availableList = [{}];

                $scope.selectedList.forEach(function (item) {
                    ids.push(item.id);
                });

                dataService.editSelectedTemplate($scope.idSelectedElement, ids)
                    .then(function(resp){
                        toastr.success('Successfully edited' );
                        $scope.personalTemplateItems = [];
                        dataService.getPersonalTemplateList()
                            .then(function (resp) {


                                $scope.personalTemplateItems = resp.data;
                                $scope.templateName = '';

                                var showElement = $scope.personalTemplateItems.filter(function (item) {
                                    if (item.id === $scope.idSelectedElement) {
                                        return true;
                                    }
                                })[0];

                                showSelection(showElement);
                                $rootScope.$broadcast('updateSelectedTemplate');
                                $rootScope.$broadcast('needRefreshParent', true);


                            });

                    }, function(resp){
                        toastr.error('Error on editing');
                    });

                $scope.isKpiSelectorDisabled = true;
                $scope.isVisibleEditButton = false;
            };



            $scope.close = function () {
                $uibModalInstance.dismiss('cancel');
            };
        });

    DashboardKpiMenuModalController.$inject = ['$scope', '$uibModal', '$log', '$sce', 'DataService', '$rootScope'];

    /* @ngInject */
    function DashboardKpiMenuModalController($scope, $uibModal, $log, $sce, DataService, $rootScope) {
        var vm = this;
        vm.title = 'ReportModalController';
        vm.animationsEnabled = true;
        vm.selectedTemplateName = '';

        $scope.needRefresh = false;


        $scope.$on('needRefreshParent', function (a, data) {

            $scope.needRefresh = data;
        });
        init();

        function init() {
            var tempList = [];
            DataService.getPersonalTemplateList()
                .then(function (resp) {

                    tempList = resp.data;
                    var activeItem = tempList.filter(function (item) {

                        if (item.active) {
                            return true;
                        }
                    })[0];

                    if (activeItem === undefined) {
                        vm.selectedTemplateName = '';
                    }
                    else {
                        vm.selectedTemplateName = activeItem.templateName;
                    }

                });
        }

        vm.open = function () {

            var modalInstance = $uibModal.open({
                animation: vm.animationsEnabled,
                templateUrl: 'app/dashboard.view/dashboard.kpi.menu.modal.html',
                controller: 'DashboardModalInstanceCtrl',
                windowClass: 'app-modal-window',
                size: 'lg',
                resolve: {
                    dataService: DataService,
                    kpiList: function () {
                        return DataService.getKpis()
                            .then(function (data) {
                                return data.data;
                            });
                    },
                    excludedKpiIds: function () {
                        return DataService.getExcludedKpiIds()
                            .then(function (data) {
                                return data.data;
                            });
                    },
                    templateTypeList: function () {
                        return DataService.getTemplateTypeLis()
                            .then(function (data) {
                                return data.data;
                            });
                    },
                    personalTemplateItems: function () {
                        return DataService.getPersonalTemplateList()
                            .then(function (resp) {
                                return resp.data;
                            });
                    }

                }
            });

            modalInstance.result.then(function (selectedItem) {
                vm.selected = selectedItem;
            }, function () {
                init();

                if($scope.needRefresh){
                    $rootScope.$broadcast('updateOnEditSelectedTemplate');
                    $scope.needRefresh = false;
                }

            });
        };

    }

})();
