(function() {
  'use strict';

  angular
    .module('AnrModule')
    .directive('reactCopilotPanel', ['$http', '$q', function($http, $q) {
      return {
        restrict: 'E',
        scope: {
          copilotLabels: '=',
          copilotPresets: '=',
          copilotAnrId: '=',
          copilotPageContext: '&'
        },
        link: function(scope, element) {
          var mountNode = element[0];
          var ReactDOM = window.ReactDOM;
          var widget = window.MonarcCopilot;
          var root = null;

          function buildRequestParams(prompt, pageContext) {
            return {
              question: prompt,
              routeName: pageContext.routeName || '',
              tabIndex: pageContext.tabIndex || 0,
              tabLabel: pageContext.tabLabel || '',
              selectedObjectUuid: pageContext.selectedObjectUuid || '',
              selectedInstanceId: pageContext.selectedInstanceId || 0,
              selectedRiskId: pageContext.selectedRiskId || 0,
              selectedOpRiskId: pageContext.selectedOpRiskId || 0
            };
          }

          function extractErrorMessage(response) {
            return response
              && response.data
              && response.data.errors
              && response.data.errors[0]
              && response.data.errors[0].message
              ? response.data.errors[0].message
              : '';
          }

          function requestCopilot(prompt, pageContext, onSuccess, onError) {
            var canceler = $q.defer();

            $http.get('api/client-anr/' + scope.copilotAnrId + '/copilot', {
              params: buildRequestParams(prompt, pageContext || {}),
              timeout: canceler.promise
            }).then(function(response) {
              onSuccess(response.data);
            }, function(response) {
              if (response && response.xhrStatus === 'abort') {
                return;
              }

              onError(extractErrorMessage(response));
            });

            return {
              abort: function() {
                canceler.resolve();
              }
            };
          }

          function runtimeMissingMessage() {
            mountNode.innerHTML = '<div class="md-warn md-caption">React copilot runtime is unavailable.</div>';
          }

          function getRenderer() {
            if (!window.React || !ReactDOM || !widget || !widget.CopilotPanel) {
              return null;
            }

            if (!root) {
              if (typeof ReactDOM.createRoot === 'function') {
                root = ReactDOM.createRoot(mountNode);
              } else if (typeof ReactDOM.render === 'function') {
                root = {
                  render: function(component) {
                    ReactDOM.render(component, mountNode);
                  },
                  unmount: function() {
                    ReactDOM.unmountComponentAtNode(mountNode);
                  }
                };
              }
            }

            return root;
          }

          function render() {
            var renderer = getRenderer();
            if (!renderer) {
              runtimeMissingMessage();
              return;
            }

            renderer.render(window.React.createElement(widget.CopilotPanel, {
              labels: scope.copilotLabels || {},
              presets: scope.copilotPresets || [],
              anrId: scope.copilotAnrId || null,
              requestCopilot: requestCopilot,
              getPageContext: function() {
                return scope.copilotPageContext();
              }
            }));
          }

          scope.$watch(function() {
            return {
              labels: scope.copilotLabels,
              presets: scope.copilotPresets,
              anrId: scope.copilotAnrId
            };
          }, render, true);

          scope.$on('$destroy', function() {
            if (root && typeof root.unmount === 'function') {
              root.unmount();
            }
          });
        }
      };
    }]);
})();
