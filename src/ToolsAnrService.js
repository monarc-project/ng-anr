(function () {
    angular
        .module('AnrModule')
        .factory('ToolsAnrService', [ ToolsAnrService ]);

    function ToolsAnrService() {
    	this.currentTab = 0;

    	this.setCurrentTab = function(i){
            this.currentTab = i;
        };
        this.getCurrentTab = function(){
            return this.currentTab;
        };

    	return this;
    }
})
();
