
var app = angular.module('codecraft', [
	'ngResource',
	'infinite-scroll',
	'angularSpinner',
	'jcs-autoValidate',
	'angular-ladda',
	'mgcrea.ngStrap',
	'toaster',
	'ngAnimate',
	'ui.router'
]);

app.config(function ($stateProvider, $urlRouterProvider) {
	$stateProvider
		.state('list', {
			url: "/",
			views: {
				'main': {
					templateUrl: 'templates/list.html',
					controller: 'PersonListController'
				},
				'search': {
					templateUrl: 'templates/searchform.html',
					controller: 'PersonListController'
				}
			}
		})
		.state('edit', {
			url: "/edit/:email",
			views: {
				'main': {
					templateUrl: 'templates/edit.html',
					controller: 'PersonDetailController'
				}
			}
		})
		.state('create', {
			url: "/create",
			views: {
				'main': {
					templateUrl: 'templates/edit.html',
					controller: 'PersonCreateController'
				}
			}
		});

	$urlRouterProvider.otherwise('/');
});

app.config(function($httpProvider, $resourceProvider, laddaProvider, $datepickerProvider) {
	$httpProvider.defaults.headers.common['Authorization'] = "Token " + api_key;
	$resourceProvider.defaults.stripTrailingSlashes = false;
	laddaProvider.setOption({
		style: 'expand-right'
	});
	angular.extend($datepickerProvider.defaults, {
		dateFormat: 'd/M/yyyy',
		autoclose: true
	});
});

app.factory("Contact", function($resource) {
	return $resource(
			'https://codecraftpro.com/api/samples/v1/contact/:id/',
			{ id: '@id' },
			{
				update: {
					method: 'PUT'
				}
			}
		);
});

app.filter('defaultImage', function() {

	return function (input, param) {
		if (!input) {
			return param;
		}
		return input;
	};

});

app.controller('PersonDetailController', function ($scope, $stateParams, $state, ContactService) {

	$scope.contacts = ContactService;

	$scope.contacts.selectedPerson = $scope.contacts.getPerson($stateParams.email);

	$scope.save = function() {
		$scope.contacts.updateContact($scope.contacts.selectedPerson).then(function () {
			$state.go("list");
		});
	}

	$scope.remove = function() {
		$scope.contacts.removeContact($scope.contacts.selectedPerson).then(function () {
			$state.go("list");
		});
	}

});

app.controller('PersonListController', function ($scope, $modal, ContactService) {

	$scope.search = "";
	$scope.order = "email";
	$scope.contacts = ContactService;

	$scope.loadMore = function () {
		 $scope.contacts.loadMore();
	};

	$scope.showCreateModal = function () {
		$scope.contacts.selectedPerson = {};
		$scope.createModal = $modal({
			scope: $scope,
			templateUrl: 'templates/modal.create.tpl.html',
			show: true
		})
	};

	$scope.createContact = function () {
		$scope.contacts.createContact($scope.contacts.selectedPerson)
			.then(function() {
				$scope.createModal.hide();
			})
	};

	$scope.$watch('search', function(newVal, oldVal) {
		if (angular.isDefined(newVal)) {
			$scope.contacts.doSearch(newVal);
		}
	});

	$scope.$watch('order', function(newVal, oldVal) {
		if (angular.isDefined(newVal)) {
			$scope.contacts.doOrder(newVal);
		}
	});

});

app.service('ContactService', ['Contact', '$q', 'toaster', function (Contact, $q, toaster) {



	var self = {
		'getPerson': function (email) {
			console.log(email);
			for (var i = 0; i < self.persons.length; i++) {
				var obj = self.persons[i];
				if (obj.email == email) {
					return obj;
				}
			}
		},
		'page': 1,
		'hasMore': true,
		'isLoading': false,
		'isSaving': false,
		'isDeleting': false,
		'selectedPerson': null,
		'persons': [],
		'search': null,
		'ordering': null,
		'doSearch': function(search) {
			self.hasMore = true;
			self.page = 1;
			self.persons = [];
			self.search = search;
			self.loadContacts();
		},
		'doOrder': function(order) {
			self.hasMore = true;
			self.page = 1;
			self.persons = [];
			self.ordering = order;
			self.loadContacts();
		},
		'loadContacts': function () {
			if (self.hasMore && !self.isLoading) {
				self.isLoading = true;

				var params = {
					'page': self.page,
					'search': self.search,
					'ordering': self.ordering
				};

				Contact.get(params, function (data) {
					console.log(data);
					angular.forEach(data.results, function(person) {
						self.persons.push(new Contact(person));
					});

					if (!data.next) {
						self.hasMore = false;
					}
					self.isLoading = false;

				});
			}
		},
		'loadMore': function () {
			 if (self.hasMore && !self.isLoading) {
			 	self.page += 1;
			 	self.loadContacts();
			 }
		},
		'updateContact': function (person) {
			var d = $q.defer();
			self.isSaving = true;
			person.$update().then(function() {
				self.isSaving = false;
				toaster.pop('success', 'Updated ' + person.name);
				d.resolve();
			});
			return d.promise;
		},
		'removeContact': function (person) {
			var d = $q.defer();
			self.isDeleting = true;
			person.$remove().then(function() {
				self.isDeleting = false;
				var index = self.persons.indexOf(person);
				self.persons.splice(index, 1);
				self.selectedPerson = null;
				toaster.pop('success', 'Deleted ' + person.name);
				d.resolve();
			});
			return d.promise;
		},
		'createContact': function (person) {
			var d = $q.defer();
			self.isSaving = true;
			Contact.save(person).$promise.then(function() {
				self.isSaving = false;
				self.selectedPerson = null;
				self.hasMore = true;
				self.page = 1;
				self.persons = [];
				self.loadContacts();
				toaster.pop('success', 'Created ' + person.name);
				d.resolve();
			});
			return d.promise;
		}

	};

	self.loadContacts();

	return self;

}]);
