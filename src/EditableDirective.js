angular.module('AnrModule').directive('editable', function(){
	return{
		restrict: 'A',
		transclude: true,
		template: '<div ng-transclude></div>',
		scope: {
			callback: '=',
		},
		controller: ['$scope', function($scope){
			this.fields = [];
			this.addField = function(field){
				this.fields.push(field);
			}

			this.callback = $scope.callback;

			this.saveChange = function(field, direction){
				if( this.callback.call(null, field.model, field.name) ){//gestion des erreurs
					field.error = false;
					field.edited = false;


					if(direction != undefined){
						var current_pos = this.fields.indexOf(field);
						var next_position = 0;
						if(direction == 'prev'){
							next_position = current_pos - 1 >= 0 ? current_pos - 1 : this.fields.length - 1;
						}
						else{//next
							next_position = current_pos + 1 < this.fields.length ? current_pos + 1 : 0;
						}
						this.fields[next_position].edited = true;
					}
				}
				else{
					field.error = true;
				}
			}
		}]
	}
}).directive('editModel', ['$parse', function($parse){

	return {
		require: ['^^editable', 'editModel'],
		restrict: 'A',
		scope:{
			editModel: "=",
		},
		controller: ['$scope', '$attrs', function($scope, $attrs){
			this.model = $scope.editModel;
		}]
	}

}]).directive('editField', ['$parse', function($parse){
	return {
		require: ['^^editable', '^^editModel'],
		restrict: 'A',
		template: '<span ng-if="! field.edited">{{field.model[field.name]}}</span>\
							<input ng-if="field.edited && field.type == \'text\'" type="text" ng-model="field.model[field.name]"  escape="cancelEdition()"  action="saveEdition" autofocus/>\
							<input ng-if="field.edited && field.type == \'number\'" type="number" ng-model="field.model[field.name]"  escape="cancelEdition()" action="saveEdition" autofocus/>\
							<textarea ng-if="field.edited && field.type == \'textarea\'" ng-model="field.model[field.name]" escape="cancelEdition()" action="saveEdition" autofocus></textarea>',
		scope: {
			name: '@editField'
		},
		link: function(scope, element, attrs, ctrls){
			editableCtrl = ctrls[0];
			modelCtrl = ctrls[1];

			scope.field = {
				edited: false,
				model: modelCtrl.model,
				name: scope.name,
				type: attrs.editType
			}

			editableCtrl.addField(scope.field);

			var handler_click = function(){
				if( ! scope.field.edited ){
					scope.$apply(function(){
						scope.startEdition();
					});
				}
			}

			element.on('click', handler_click);

			scope.startEdition = function(){
				scope.field.edited = true;
				scope.field.initialValue = scope.field.model[scope.field.name];
			}

			scope.cancelEdition = function(){
				scope.field.model[scope.field.name] = scope.field.initialValue;
				scope.field.edited = false;
			}

			scope.saveEdition = function(direction){
				editableCtrl.saveChange(scope.field, direction);
			}
		}
	}
}]).directive('escape', function(){
	return {
		restrict: 'A',
		link: function(scope, element, attrs){
			element.bind("keydown keypress", function(event){
				if( event.which == 27){
					scope.$apply(function(){
						scope.$eval(attrs.escape);
					});
					event.preventDefault();
					event.stopPropagation();
				}
			});
		}
	};
}).directive('action', function() {
  return {
    restrict: 'A',
    scope:{
    	callback: '=action'
    },
    link: function(scope, element, attrs) {
      element.bind("keydown keypress", function(event) {
      	function triggerValidation(direction){
      		scope.$apply(function() {
      			scope.callback.call(null, direction);
          });
          return event.preventDefault();
      	}

        if ( element.prop('tagName').toLowerCase() == "textarea" && ((event.which === 13 && event.ctrlKey) || (event.which === 13 && event.metaKey))) {
          triggerValidation();
        }
        else if(element.prop('tagName').toLowerCase() != "textarea" && event.which === 13){
      		triggerValidation();
      	}
      	else if(event.which == 9 && event.shiftKey){//Shift TAB
      		triggerValidation('prev');
      	}
      	else if(event.which == 9){//TAB
      		triggerValidation('next');
      	}

      });
    }
  };
});
