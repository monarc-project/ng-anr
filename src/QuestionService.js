(function () {

    angular
        .module('AnrModule')
        .factory('QuestionService', [ '$resource', '$rootScope', 'gettextCatalog', QuestionService ]);

    function QuestionService($resource, $rootScope, gettextCatalog) {
        var self = this;

        var anr = $rootScope.OFFICE_MODE == "FO" ? "client-anr/:urlAnrId/" : "";

        var makeResource = function () {
            self.QuestionResource = $resource('api/' + anr + 'questions/:questionId', {
                    questionId: '@id',
                    urlAnrId: $rootScope.getUrlAnrId()
                },
                {
                    'update': {
                        method: 'PUT'
                    },
                    'patch': {
                        method: 'PATCH'
                    },
                    'query': {
                        isArray: false
                    }
                });
        }
        makeResource();

        var getQuestions = function (params) {
            return self.QuestionResource.query(params).$promise;
        };

        var getQuestion = function (id) {
            return self.QuestionResource.query({questionId: id}).$promise;
        };

        var createQuestion = function (params, success, error) {
            new self.QuestionResource(params).$save(success, error);
        };

        var updateQuestion = function (params, success, error) {
            self.QuestionResource.update(params, success, error);
        };

        var patchQuestion = function (id, params, success, error) {
            self.QuestionResource.patch({questionId: id}, params, success, error);
        };

        var deleteQuestion = function (id, success, error) {
            self.QuestionResource.delete({questionId: id}, success, error);
        };


        self.ChoiceResource = $resource('api/questions-choices/:choiceId', { choiceId: '@id' },
            {
                'update': {
                    method: 'PUT'
                },
                'query': {
                    isArray: false
                }
            });

        var getChoices = function (params) {
            return self.ChoiceResource.query(params).$promise;
        };

        var getChoice = function (id) {
            return self.ChoiceResource.query({choiceId: id}).$promise;
        };

        var createChoice = function (params, success, error) {
            new self.ChoiceResource(params).$save(success, error);
        };

        var updateChoice = function (params, success, error) {
            self.ChoiceResource.update(params, success, error);
        };

        var updateChoices = function (params, success, error) {
            self.ChoiceResource.update({}, params, success, error);
        };

        var deleteChoice = function (id, success, error) {
            self.ChoiceResource.delete({choiceId: id}, success, error);
        };

        return {
            makeResource: makeResource,
            getQuestions: getQuestions,
            getQuestion: getQuestion,
            createQuestion: createQuestion,
            deleteQuestion: deleteQuestion,
            updateQuestion: updateQuestion,
            patchQuestion: patchQuestion,

            getChoices: getChoices,
            getChoice: getChoice,
            createChoice: createChoice,
            deleteChoice: deleteChoice,
            updateChoice: updateChoice,
            updateChoices: updateChoices,
        };
    }

})
();