(function() {

  angular
    .module('AnrModule')
    .controller('AnrLayoutCtrl', [
      '$scope', 'toastr', '$http', '$q', '$mdMedia', '$mdDialog', '$timeout', 'gettextCatalog', 'gettext', 'TableHelperService',
      'ModelService', 'ObjlibService', 'AnrService', '$stateParams', '$rootScope', '$location', '$state', 'ToolsAnrService',
      '$transitions', 'DownloadService', '$mdPanel', '$injector', 'ConfigService', 'ClientRecommendationService',
      'ReferentialService', 'AmvService', 'RiskService', 'RiskSourceService', 'InterestedPartyService', 'ReassessmentTriggerService',
      'SoaScaleCommentService', 'UserService', AnrLayoutCtrl
    ]);

  /**
   * ANR MAIN LAYOUT CONTROLLER
   */
  function AnrLayoutCtrl($scope, toastr, $http, $q, $mdMedia, $mdDialog, $timeout, gettextCatalog, gettext, TableHelperService, ModelService,
    ObjlibService, AnrService, $stateParams, $rootScope, $location, $state, ToolsAnrService,
    $transitions, DownloadService, $mdPanel, $injector, ConfigService, ClientRecommendationService,
    ReferentialService, AmvService, RiskService, RiskSourceService, InterestedPartyService, ReassessmentTriggerService,
    SoaScaleCommentService, UserService) {


    if ($scope.OFFICE_MODE == 'FO') {
      if (!$scope.display) {
        switch ($state.current.name) {
          default:
          case 'main.project.anr':
            $scope.display = {
              show_hidden_impacts: false,
              show_hidden_opRisks_impacts: false,
              anrSelectedTabIndex: 0
            };
            break;
          case 'main.project.anr.dashboard':
            $scope.display = {
              show_hidden_impacts: false,
              anrSelectedTabIndex: 1
            };
            break;
          case 'main.project.anr.scales':
            $scope.display = {
              show_hidden_impacts: false,
              anrSelectedTabIndex: 2
            };
            break;
          case 'main.project.anr.knowledge':
            $scope.display = {
              show_hidden_impacts: false,
              anrSelectedTabIndex: 3
            };
            break;
          case 'main.project.anr.ropa':
            $scope.display = {
              show_hidden_impacts: false,
              anrSelectedTabIndex: 4
            };
            break;
          case 'main.project.anr.soa':
            $scope.display = {
              show_hidden_impacts: false,
              anrSelectedTabIndex: 5
            };
            break;
          case 'main.project.anr.soa.sheet':
            $scope.display = {
              show_hidden_impacts: false,
              anrSelectedTabIndex: 6
            };
            break;
        }
      }
    } else {
      $scope.display = {
        show_hidden_impacts: false,
        anrSelectedTabIndex: 0
      };
    }

    var self = this;
    var reviewFrequencyValues = [
      'Monthly',
      'Quarterly',
      'Semi-annually',
      'Annually',
      'On trigger'
    ];
    var reviewFrequencyOtherValue = '__other__';
    var historyTargetTypes = {
      informationRisk: 1,
      operationalRisk: 2
    };
    $scope.historyChangeTypeOptions = [{
      value: 0,
      label: 'All changes'
    }, {
      value: 1,
      label: 'Risk created'
    }, {
      value: 10,
      label: 'Field changes'
    }, {
      value: 20,
      label: 'Recommendation linked'
    }, {
      value: 21,
      label: 'Recommendation unlinked'
    }, {
      value: 30,
      label: 'Consequence created'
    }, {
      value: 31,
      label: 'Consequence updated'
    }, {
      value: 32,
      label: 'Consequence deleted'
    }, {
      value: 33,
      label: 'Impact scale update'
    }, {
      value: 40,
      label: 'Residual acceptance updated'
    }];

    $scope.ToolsAnrService = ToolsAnrService;
    $scope.GlobalResizeMenuSize = 230;
    $scope.GlobalResizeMenuContentHide = false;
    var minWidthMenu = 80;
    var isModelLoading = false;
    var __panel = null;
    $scope.riskSources = [];
    $scope.currentUserProfile = null;

    $scope.canManageSupervisorLinkedUsers = function() {
      return $scope.OFFICE_MODE == 'FO' && UserService.isAllowed('superadminfo');
    };

    $scope.isResidualRiskNotAccepted = function(decision) {
      return decision === 'rejected' || decision === 'not_accepted';
    };

    $scope.getResidualRiskDecisionLabel = function(decision) {
      switch (decision) {
        case 'accepted':
          return gettextCatalog.getString('Accepted');
        case 'rejected':
        case 'not_accepted':
          return gettextCatalog.getString('Not accepted');
        default:
          return gettextCatalog.getString('Pending');
      }
    };

    $scope.getSupervisorDisplayName = function(supervisor) {
      if (!supervisor) {
        return '';
      }

      return supervisor.name || '';
    };

    $scope.isResidualRiskApprover = function(supervisor) {
      return !!(supervisor
        && supervisor.isActive !== false
        && (supervisor.roles || []).indexOf('residual_risk_approver') !== -1);
    };

    $scope.canUseRiskOwnerAsResidualApprover = function(sheet) {
      return !!(sheet
        && sheet.riskOwnerSupervisor
        && $scope.isResidualRiskApprover(sheet.riskOwnerSupervisor));
    };

    $scope.hasResidualRiskOwnerSelection = function(sheet) {
      return !!(sheet && sheet.riskOwnerSupervisorId);
    };

    $scope.isResidualAcceptancePanelDisabled = function(sheet) {
      return !$scope.hasResidualRiskOwnerSelection(sheet);
    };

    $scope.getEffectiveResidualApprover = function(sheet) {
      if (!sheet || $scope.isResidualAcceptancePanelDisabled(sheet)) {
        return null;
      }

      if (sheet.residualAcceptanceUseRiskOwner) {
        return $scope.canUseRiskOwnerAsResidualApprover(sheet) ? sheet.riskOwnerSupervisor : null;
      }

      return sheet.residualAcceptanceApproverSupervisorSelection
        || sheet.residualAcceptanceApproverSupervisor
        || null;
    };

    $scope.canCurrentUserDecideResidualRisk = function(sheet) {
      var approver = $scope.getEffectiveResidualApprover(sheet);
      if (!approver) {
        return false;
      }

      if (!$scope.isAnrReadOnly && (!approver.linkedUser || !approver.linkedUser.id)) {
        return true;
      }

      return !!(approver.linkedUser && $scope.isCurrentUserLinkedResidualApprover(approver.linkedUser));
    };

    $scope.isCurrentUserLinkedResidualApprover = function(linkedUser) {
      if (!linkedUser) {
        return false;
      }

      var currentUserId = parseInt(($scope.currentUserProfile && $scope.currentUserProfile.id) || UserService.getUserId(), 10);
      var linkedUserId = parseInt(linkedUser.id, 10);
      if (!isNaN(currentUserId) && !isNaN(linkedUserId) && currentUserId === linkedUserId) {
        return true;
      }

      var currentUserEmail = (($scope.currentUserProfile && $scope.currentUserProfile.email) || '').trim().toLowerCase();
      var linkedUserEmail = ((linkedUser.email || '') + '').trim().toLowerCase();

      return !!currentUserEmail && currentUserEmail === linkedUserEmail;
    };

    $scope.isResidualRiskReadOnly = function(sheet) {
      var approver = $scope.getEffectiveResidualApprover(sheet);
      return !approver || !$scope.canCurrentUserDecideResidualRisk(sheet);
    };

    $scope.isCurrentUserLinkedRiskOwner = function(sheet) {
      return !!(sheet
        && sheet.riskOwnerSupervisor
        && sheet.riskOwnerSupervisor.linkedUser
        && $scope.isCurrentUserLinkedResidualApprover(sheet.riskOwnerSupervisor.linkedUser));
    };

    $scope.canCurrentUserEditMonitoringAndReview = function(sheet) {
      if (!sheet) {
        return false;
      }

      if (!$scope.isAnrReadOnly) {
        return true;
      }

      return $scope.isCurrentUserLinkedRiskOwner(sheet);
    };

    $scope.canCurrentUserEditRiskOwner = function(sheet) {
      return !!sheet && !$scope.isAnrReadOnly;
    };

    $scope.canSaveRiskSheetFields = function(sheet) {
      return !!(sheet
        && (!$scope.isAnrReadOnly
          || $scope.canCurrentUserEditMonitoringAndReview(sheet)
          || $scope.canCurrentUserDecideResidualRisk(sheet)));
    };

    $scope.getResidualPerformerSummary = function(sheet) {
      if (!sheet || (!sheet.residualAcceptancePerformedByName && !sheet.residualAcceptancePerformedByEmail)) {
        return '';
      }

      var performer = sheet.residualAcceptancePerformedByName || '';
      if (sheet.residualAcceptancePerformedByEmail) {
        performer += (performer ? ' ' : '') + '<' + sheet.residualAcceptancePerformedByEmail + '>';
      }

      if (sheet.residualAcceptancePerformedOnBehalf) {
        var approver = $scope.getEffectiveResidualApprover(sheet);
        if (approver && approver.name) {
          return gettextCatalog.getString('Performed by') + ' ' + performer + ' '
            + gettextCatalog.getString('on behalf of') + ' ' + approver.name;
        }
      }

      return gettextCatalog.getString('Performed by') + ': ' + performer;
    };

    $scope.hasResidualAcceptanceData = function(sheet) {
      if (!sheet) {
        return false;
      }

      return !!(sheet.residualAcceptanceUseRiskOwner
        || sheet.residualAcceptanceApproverSupervisorId
        || sheet.residualRiskDecision
        || sheet.residualRiskDecidedAt
        || sheet.residualRiskJustification
        || sheet.residualAcceptancePerformedByName
        || sheet.residualAcceptancePerformedByEmail);
    };

    $scope.shouldWarnRiskOwnerRemoval = function(sheet, nextRiskOwnerSupervisorId) {
      if (!sheet || nextRiskOwnerSupervisorId) {
        return false;
      }

      if (!sheet.riskOwnerSupervisorId) {
        return false;
      }

      return !!($scope.getEffectiveResidualApprover(sheet) || $scope.hasResidualAcceptanceData(sheet));
    };

    $scope.hasPendingRiskOwnerRemoval = function(sheet) {
      return !!(sheet
        && !$scope.isAnrReadOnly
        && !$scope.isResidualAcceptancePanelDisabled(sheet)
        && ((sheet.ownerSearchText || '').trim()) === ''
        && sheet.riskOwnerSupervisorId);
    };

    $scope.shouldResetResidualDecisionAfterRiskOwnerChange = function(sheet, nextRiskOwnerSupervisorId) {
      if (!sheet || !sheet.residualAcceptanceUseRiskOwner) {
        return false;
      }

      var effectiveApprover = $scope.getEffectiveResidualApprover(sheet);
      var currentRiskOwnerSupervisorId = sheet.riskOwnerSupervisorId || null;
      if (!effectiveApprover || String(effectiveApprover.id || '') !== String(currentRiskOwnerSupervisorId || '')) {
        return false;
      }

      var hasResettableResidualAcceptanceData = !!(
        sheet.residualRiskDecision
        || sheet.residualRiskDecidedAt
        || sheet.residualRiskDecidedAtValue
        || sheet.residualRiskJustification
        || sheet.residualAcceptancePerformedByName
        || sheet.residualAcceptancePerformedByEmail
      );
      if (!hasResettableResidualAcceptanceData) {
        return false;
      }

      var previousRiskOwnerSupervisorId = sheet.riskOwnerSupervisorId || null;
      var normalizedNextRiskOwnerSupervisorId = nextRiskOwnerSupervisorId || null;

      return String(previousRiskOwnerSupervisorId || '') !== String(normalizedNextRiskOwnerSupervisorId || '');
    };

    $scope.shouldConfirmRiskOwnerChange = function(sheet, nextRiskOwnerSupervisorId) {
      return $scope.shouldResetResidualDecisionAfterRiskOwnerChange(sheet, nextRiskOwnerSupervisorId)
        || $scope.shouldWarnRiskOwnerRemoval(sheet, nextRiskOwnerSupervisorId);
    };

    $scope.restoreRiskOwnerSelection = function(sheet, previousRiskOwnerSupervisor, previousRiskOwnerName) {
      if (!sheet) {
        return;
      }

      sheet._skipRiskOwnerSelectionChange = true;
      sheet.owner = previousRiskOwnerName || '';
      sheet.riskOwnerSupervisor = previousRiskOwnerSupervisor || null;
      sheet.riskOwnerSupervisorId = previousRiskOwnerSupervisor ? previousRiskOwnerSupervisor.id : null;
      sheet.riskOwnerSupervisorName = previousRiskOwnerName || '';
      sheet.ownerSupervisorSelection = previousRiskOwnerSupervisor || null;
      sheet.ownerSearchText = previousRiskOwnerName || '';
      $scope.applyResidualAcceptanceState(sheet, {
        preserveDecisionFields: true
      });

      $timeout(function() {
        sheet._skipRiskOwnerSelectionChange = false;
      });
    };

    $scope.resetResidualAcceptanceAfterRiskOwnerChange = function(sheet, options) {
      if (!sheet) {
        return;
      }

      if (options && options.preserveApproverContext) {
        $scope.clearResidualAcceptanceDecisionFields(sheet);
        $scope.applyResidualAcceptanceState(sheet, {
          preserveDecisionFields: true
        });
        return;
      }

      $scope.clearResidualAcceptanceData(sheet, {
        preserveRiskOwnerFlag: !!(sheet.residualAcceptanceUseRiskOwner
          && $scope.canUseRiskOwnerAsResidualApprover(sheet))
      });
      $scope.applyResidualAcceptanceState(sheet);
    };

    $scope.clearResidualAcceptanceDecisionFields = function(sheet) {
      if (!sheet) {
        return;
      }

      sheet.residualRiskDecision = null;
      sheet.residualRiskDecidedAt = null;
      sheet.residualRiskDecidedAtValue = null;
      sheet.residualRiskJustification = null;
      sheet.residualAcceptancePerformedByName = null;
      sheet.residualAcceptancePerformedByEmail = null;
      sheet.residualAcceptancePerformedOnBehalf = false;
      sheet.residualRiskDecidedBySupervisor = null;
      sheet.residualRiskDecidedBySupervisorId = null;
      sheet.residualRiskDecidedByUserId = null;
      sheet.residualRiskDecidedByName = null;
      sheet.residualAcceptancePerformerTouched = false;
    };

    $scope.clearResidualAcceptanceData = function(sheet, options) {
      if (!sheet) {
        return;
      }

      var preserveRiskOwnerFlag = options && options.preserveRiskOwnerFlag;

      if (!preserveRiskOwnerFlag) {
        sheet.residualAcceptanceUseRiskOwner = false;
      }
      sheet.residualAcceptanceApproverSupervisor = null;
      sheet.residualAcceptanceApproverSupervisorId = null;
      sheet.residualAcceptanceApproverSupervisorSelection = null;
      sheet.residualAcceptanceApproverSearchText = '';
      $scope.clearResidualAcceptanceDecisionFields(sheet);
    };

    $scope.captureResidualAcceptanceSnapshot = function(sheet) {
      if (!sheet) {
        return;
      }

      sheet._residualAcceptanceSnapshot = {
        riskOwnerSupervisorId: sheet.riskOwnerSupervisorId || null,
        residualAcceptanceUseRiskOwner: !!sheet.residualAcceptanceUseRiskOwner,
        residualAcceptanceApproverSupervisorId: sheet.residualAcceptanceApproverSupervisorId || null,
        residualRiskDecision: sheet.residualRiskDecision || null,
        residualRiskDecidedAt: $scope.formatDateValue(sheet.residualRiskDecidedAtValue) || null,
        residualRiskJustification: (sheet.residualRiskJustification || '').trim() || null,
        residualAcceptancePerformedByName: sheet.residualAcceptancePerformedByName || null,
        residualAcceptancePerformedByEmail: sheet.residualAcceptancePerformedByEmail || null,
        residualAcceptancePerformedOnBehalf: !!sheet.residualAcceptancePerformedOnBehalf
      };
      sheet.residualAcceptancePerformerTouched = false;
    };

    $scope.applyResidualAcceptanceState = function(sheet, options) {
      if (!sheet) {
        return;
      }

      if ($scope.isResidualAcceptancePanelDisabled(sheet)) {
        if (sheet.residualAcceptanceUseRiskOwner) {
          $scope.clearResidualAcceptanceData(sheet);
        }
        return;
      }

      if ($scope.canUseRiskOwnerAsResidualApprover(sheet)) {
        if (sheet.residualAcceptanceUseRiskOwner) {
          sheet.residualAcceptanceApproverSupervisor = sheet.riskOwnerSupervisor;
          sheet.residualAcceptanceApproverSupervisorId = sheet.riskOwnerSupervisorId;
          sheet.residualAcceptanceApproverSupervisorSelection = sheet.riskOwnerSupervisor;
          sheet.residualAcceptanceApproverSearchText = sheet.riskOwnerSupervisorName || sheet.owner || '';
        }
      } else if (sheet.residualAcceptanceUseRiskOwner) {
        $scope.clearResidualAcceptanceData(sheet);
        return;
      }

      if (!sheet.residualAcceptanceUseRiskOwner) {
        if (sheet.residualAcceptanceApproverSupervisorSelection) {
          if (!$scope.isResidualRiskApprover(sheet.residualAcceptanceApproverSupervisorSelection)) {
            $scope.clearResidualAcceptanceData(sheet, { preserveRiskOwnerFlag: true });
            return;
          }
          sheet.residualAcceptanceApproverSupervisor = sheet.residualAcceptanceApproverSupervisorSelection;
          sheet.residualAcceptanceApproverSupervisorId = sheet.residualAcceptanceApproverSupervisorSelection.id;
          sheet.residualAcceptanceApproverSearchText = sheet.residualAcceptanceApproverSupervisorSelection.name || '';
        } else if (!sheet.residualAcceptanceApproverSupervisorId) {
          if (!(options && options.preserveDecisionFields)) {
            sheet.residualRiskDecision = null;
            sheet.residualRiskDecidedAt = null;
            sheet.residualRiskDecidedAtValue = null;
            sheet.residualRiskJustification = null;
            sheet.residualAcceptancePerformedByName = null;
            sheet.residualAcceptancePerformedByEmail = null;
            sheet.residualAcceptancePerformedOnBehalf = false;
          }
        }
      }
    };

    $scope.onResidualAcceptanceUseRiskOwnerChanged = function(sheet) {
      if (!sheet) {
        return;
      }

      $scope.clearResidualAcceptanceData(sheet, {
        preserveRiskOwnerFlag: !!sheet.residualAcceptanceUseRiskOwner
      });
      $scope.applyResidualAcceptanceState(sheet);
    };

    $scope.setCurrentUserAsResidualPerformer = function(sheet) {
      if (!sheet || !$scope.currentUserProfile || !$scope.canCurrentUserDecideResidualRisk(sheet)) {
        return;
      }

      var fullName = (($scope.currentUserProfile.firstname || '') + ' ' + ($scope.currentUserProfile.lastname || '')).trim();
      sheet.residualAcceptancePerformedByName = fullName || $scope.currentUserProfile.email || null;
      sheet.residualAcceptancePerformedByEmail = $scope.currentUserProfile.email || null;
      sheet.residualAcceptancePerformedOnBehalf = !!($scope.getEffectiveResidualApprover(sheet)
        && !$scope.getEffectiveResidualApprover(sheet).linkedUser);
      sheet.residualAcceptancePerformerTouched = true;
    };

    if ($scope.OFFICE_MODE == 'FO') {
      $http.get('api/user/profile').then(function(response) {
        $scope.currentUserProfile = response.data || response;
      });
    }

    if ($scope.OFFICE_MODE == 'FO') {
      $rootScope.$on("$locationChangeStart", function(e, nextUrl, oldUrl) {
        if (nextUrl != oldUrl && nextUrl.substring(nextUrl.length - 4) == '/anr' && ($scope.display.anrSelectedTabIndex != 0 || $scope.opsheet_risk || $scope.sheet_risk)) {
          $rootScope.anr_selected_object_id = null;
          $rootScope.anr_selected_instance_id = null;
          $scope.opsheet_risk = null;
          $scope.sheet_risk = null;
          $scope.risks = [];
          $scope.oprisks = [];
          ToolsAnrService.currentTab = 0;
          $scope.display.anrSelectedTabIndex = 0;
          // Do NOT call e.preventDefault() here — the URL must update to reflect the actual navigation target.
        }
      });
    }

    $scope.resetFilters = function() {
      $scope.resetRisksFilters();
      $scope.resetRisksOpFilters();
    }

    $scope.isRiskTabNavigationLocked = function() {
      return !!(
        $scope.sheet_risk ||
        $scope.opsheet_risk ||
        $stateParams.riskId ||
        $stateParams.riskopId
      );
    }

    var onBeforeHook = $transitions.onBefore({}, function() {
      if ($scope.OFFICE_MODE == 'FO') {
        if (($state.$current.name == 'main.project.anr.risk' && $stateParams.riskId) ||
          ($state.$current.name == 'main.project.anr.riskop' && $stateParams.riskopId) ||
          ($state.$current.name == 'main.project.anr.instance.risk' && $stateParams.riskId && $stateParams.instId) ||
          ($state.$current.name == 'main.project.anr.instance.riskop' && $stateParams.riskopId && $stateParams.instId)) {
          // TODO: uncomment when the risks saving will be done on each field change separately by [patch]
          // if ($scope.sheet_risk) {
          //     $scope.saveRiskSheet($scope.sheet_risk);
          // }
          // if ($scope.opsheet_risk) {
          //     $scope.saveOpRiskSheet($scope.opsheet_risk);
          // }
        } else if ($scope.display.anrSelectedTabIndex == 0) {
          $scope.resetSheet(true);
          $scope.resetOpSheet(true);

          if (!$scope.risks_filters || !$scope.risks_op_filters) { //Initilizing filters
            $scope.resetFilters();
          }
        }
      } else {
        $scope.resetSheet();
        $scope.resetOpSheet();
        $scope.resetFilters();
      }

      $timeout(function() {
        if ($state.$current.name == 'main.kb_mgmt.models.details' || $state.$current.name == 'main.project.anr') {
          $rootScope.anr_selected_instance_id = null;
          $rootScope.anr_selected_object_id = null;

          if ($scope.model && $scope.model.anr && $scope.model.anr.id && $stateParams.modelId == $scope.model.anr.id) {
            if (ToolsAnrService.currentTab == 0) {
              $scope.updateAnrRisksTable();
            } else {
              $scope.updateAnrRisksOpTable();
            }
          }
        }
      });

      if (__panel) {
        __panel.close();
      }

      $mdDialog.cancel();

    });

    $scope.$on("$destroy", onBeforeHook);

    // Handle manual URL navigation to a different risk/oprisk ID in the same state.
    // When the user edits the riskId in the address bar and presses Enter, UI-Router
    // fires a transition for the same state with new params. The onBefore hook does
    // nothing in that case, so we need to react here after the transition succeeds.
    var onSuccessHook = $transitions.onSuccess({}, function(trans) {
      if ($scope.OFFICE_MODE !== 'FO') return;
      var toName = trans.to().name;
      var newParams = trans.params();
      var fromParams = trans.params('from');

      if ((toName === 'main.project.anr.risk' || toName === 'main.project.anr.instance.risk') &&
          newParams.riskId && String(newParams.riskId) !== String(fromParams.riskId)) {
        var found = $scope.risks && $scope.risks.find(function(r) { return String(r.id) === String(newParams.riskId); });
        if (found) {
          applyRiskSheetData(found, $scope.risks);
        } else if ($scope.model && $scope.model.anr) {
          AnrService.getAnrRisks($scope.model.anr.id, { limit: 0, order: 'maxRisk', order_direction: 'desc', thresholds: -1 }).then(function(data) {
            var risk = data.risks && data.risks.find(function(r) { return String(r.id) === String(newParams.riskId); });
            if (risk) {
              applyRiskSheetData(risk, data.risks);
            }
          });
        }
      }

      if ((toName === 'main.project.anr.riskop' || toName === 'main.project.anr.instance.riskop') &&
          newParams.riskopId && String(newParams.riskopId) !== String(fromParams.riskopId)) {
        var foundOp = $scope.oprisks && $scope.oprisks.find(function(r) { return String(r.id) === String(newParams.riskopId); });
        if (foundOp) {
          applyOpRiskSheetData(foundOp, $scope.oprisks);
        } else if ($scope.model && $scope.model.anr) {
          AnrService.getAnrRisksOp($scope.model.anr.id, { limit: 0, order: 'cacheNetRisk', order_direction: 'desc', thresholds: -1 }).then(function(data) {
            var opRisk = data.oprisks && data.oprisks.find(function(r) { return String(r.id) === String(newParams.riskopId); });
            if (opRisk) {
              applyOpRiskSheetData(opRisk, data.oprisks);
            }
          });
        }
      }
    });
    $scope.$on("$destroy", onSuccessHook);

    $scope.ceil = Math.ceil;

    $scope.$on("angular-resizable.resizeEnd", function(event, args) {
      if (args.id != undefined && args.id == 'global-resize-menu' && parseInt(args.width) <= minWidthMenu) {
        $scope.GlobalResizeMenuSize = 0;
      }
    });
    $scope.$on("angular-resizable.resizing", function(event, args) {
      if (args.id != undefined && args.id == 'global-resize-menu') {
        $scope.GlobalResizeMenuContentHide = (parseInt(args.width) <= minWidthMenu);
        $scope.GlobalResizeMenuSize = args.width;
      }
    });

    // Called by ObjectCtrl when an object has been modified
    $rootScope.hookUpdateObjlib = function(gotofirst) {
      $scope.updateInstances();
      $scope.updateModel();
      $scope.updateObjectsLibrary(gotofirst);
    };

    $scope.updateModel = function(justCore, cb) {
      isModelLoading = true;
      let defaultLanguageIndex = UserService.getUiLanguage();
      if ($scope.OFFICE_MODE == 'BO') {
        ModelService.getModel($stateParams.modelId).then(function(data) {
          $scope.model = data;
          $rootScope.anr_id = data.anr.id;
          $scope.isAnrReadOnly = false;
          $scope.languages = ConfigService.getLanguages();
          $scope.opRisksScales = {
            language: defaultLanguageIndex
          };
          $scope.opRisksLanguageSelected = $scope.languages[$scope.opRisksScales.language].code;
          $scope.scales.language = defaultLanguageIndex;
          SoaScaleCommentService.getSoaScaleComments({
            anrId: $rootScope.anr_id,
            language: $scope.getLanguageCode(defaultLanguageIndex)
          }).then(function(data) {
            $scope.soaScale = {
              levels: {
                max: data.data.filter(comment => !comment.isHidden).length
              },
              language: defaultLanguageIndex,
              comments: data.data
            };
          });

          thresholdsWatchSetup = false;
          $scope.thresholds = {
            thresholds: {
              min: $scope.model.anr.seuil1,
              max: $scope.model.anr.seuil2
            },
            rolf_thresholds: {
              min: $scope.model.anr.seuilRolf1,
              max: $scope.model.anr.seuilRolf2
            }
          }

          if (!justCore) {
            $scope.updateAnrRisksTable();
            $scope.updateAnrRisksOpTable();
            $scope.updateInstances();
            $scope.updateObjectsLibrary();
            $scope.updateScales();
            $scope.updateOperationalRiskScales();
            $scope.updateReferentials();
          }

          isModelLoading = false;

          if (cb) {
            cb();
          }
        });
      } else {
        var ClientAnrService = $injector.get('ClientAnrService');
        ClientAnrService.getAnr($stateParams.modelId).then(function(data) {
          let language = data.language;
          let languageCode = data.languageCode;
          $rootScope.anr_id = data.id;
          $scope.model = {
            id: null,
            anr: data,
            showRolfBrut: data.cacheModelShowRolfBrut && data.showRolfBrut,
          };
          $scope.rolfBrut = {
            show: $scope.model.showRolfBrut == 1 ? true : false
          }
          $scope.isAnrReadOnly = (data.rwd == 0);
          $scope.languages = ConfigService.getLanguages();
          $scope.scales.language = language;
          $scope.opRisksScales = {
            language: language
          };
          SoaScaleCommentService.getSoaScaleComments({
            anrId: $rootScope.anr_id,
            language: languageCode
          }).then(function(data) {
            $scope.soaScale = {
              levels: {
                max: data.data.filter(comment => !comment.isHidden).length
              },
              language: language,
              comments: data.data
            };
          });
          $scope.opRisksLanguageSelected = $scope.languages[$scope.opRisksScales.language].code;
          $scope.$parent.$parent.clientCurrentAnr = data;

          thresholdsWatchSetup = false;
          $scope.thresholds = {
            thresholds: {
              min: $scope.model.anr.seuil1,
              max: $scope.model.anr.seuil2
            },
            rolf_thresholds: {
              min: $scope.model.anr.seuilRolf1,
              max: $scope.model.anr.seuilRolf2
            }
          }

          if (!justCore) {
            $scope.updateAnrRisksTable();
            $scope.updateAnrRisksOpTable();
            $scope.updateInstances();
            $scope.updateObjectsLibrary();
            $scope.updateScales();
            $scope.updateOperationalRiskScales();
            $scope.updateReferentials();
            $scope.updateRecommendationsSets();
            updateMethodProgress();

          }

          if ($rootScope.setAnrLanguage) {
            $rootScope.setAnrLanguage(data.language);
          }

          isModelLoading = false;

          if (cb) {
            cb();
          }
        })
      }

    };

    $scope.updateReferentials = function() {
      $scope.referentials = [];
      ReferentialService.getReferentials({
        order: 'createdAt'
      }).then(function(data) {
        $scope.referentials.items = data;
        $scope.updatingReferentials = true;
      });
    };

    $scope.updateRecommendationsSets = function() {
      $scope.recommendationsSets = [];
      ClientRecommendationService.getRecommendationsSets().then(function(data) {
        $scope.recommendationsSets = data['recommendations-sets'];
        $scope.updatingRecommendationsSets = true;
      });
    };

    $scope.updateAnrRisksTable = function(cb) {
      $scope.anr_risks_table_loading = true;
      AnrService.getAnrRisks($scope.model.anr.id, $scope.risks_filters).then(function(data) {
        if (!$scope.risks || $scope.risks.length != data.risks.length) {
          $scope.risks_total = data.count;
          $scope.risks = data.risks; // for the _table_risks.html partial
        } else {
          // patch up only if we already have a risks table
          // if this cause a problem, add a flag to updateModel so that we patch only in the risks
          // table callback, and do a full refresh otherwise
          $scope.risks_total = data.count;
          for (var i = 0; i < $scope.risks.length; ++i) {
            for (var j in $scope.risks[i]) {
              $scope.risks[i][j] = data.risks[i][j];
            }
          }
        }

        if (($state.$current.name == 'main.project.anr.risk' || $state.$current.name == 'main.project.anr.instance.risk') && $stateParams.riskId) {
          angular.forEach($scope.risks, function(r) {
            if (r.id == $stateParams.riskId) {
              applyRiskSheetData(r, $scope.risks);
            }
          });
        }

        if (cb) {
          cb();
        }

        $scope.anr_risks_table_loading = false;
      });
    };

    $rootScope.$on('recommendationsSetsUpdated', function() {
      $scope.updateRecommendationsSets();
    });

    $rootScope.$on('referentialsUpdated', function() {
      $scope.updateReferentials();
    });

    $rootScope.$on('amvUpdated', function() {
      $scope.updateAnrRisksTable();
    });

    $rootScope.$on('opRiskUpdated', function() {
      $scope.updateAnrRisksOpTable();
    });

    $scope.resetRisksFilters = function() {
      $scope.risks_filters = {
        order: 'maxRisk',
        order_direction: 'desc',
        thresholds: -1,
        page: 1,
        limit: 20
      };
    };

    $scope.updateShowRolfBrut = function() {
      service = $injector.get('ClientAnrService');
      anr = angular.copy($scope.model.anr)
      anr.showRolfBrut = $scope.rolfBrut.show == true ? 1 : 0;
      service.patchAnr($scope.model.anr.id, anr, function() {
        $scope.model.showRolfBrut = anr.showRolfBrut;
      });
      $scope.model.anr = anr;
    };

    $scope.updateAnrRisksOpTable = function(cb) {
      $scope.anr_risks_op_table_loading = true;

      AnrService.getAnrRisksOp($scope.model.anr.id, $scope.risks_op_filters).then(function(data) {
        if (!$scope.oprisks || $scope.oprisks.length != data.oprisks.length) {
          $scope.oprisks_total = data.count;
          $scope.oprisks = data.oprisks; // for the _table_risks_op.html partial
        } else {
          // patch up only if we already have a risks table
          // if this cause a problem, add a flag to updateModel so that we patch only in the risks
          // table callback, and do a full refresh otherwise
          $scope.oprisks_total = data.count;
          for (var i = 0; i < $scope.oprisks.length; ++i) {
            for (var j in $scope.oprisks[i]) {
              $scope.oprisks[i][j] = data.oprisks[i][j];
            }
          }

          $scope.opRiskImpactScales = angular.copy($scope.opRiskImpactScales); // force binding operational scales $scope
        }

        if (($state.$current.name == 'main.project.anr.riskop' || $state.$current.name == 'main.project.anr.instance.riskop') && $stateParams.riskopId) {
          angular.forEach($scope.oprisks, function(r) {
            if (r.id == $stateParams.riskopId) {
              applyOpRiskSheetData(r, $scope.oprisks);
            }
          });
        }

        if (cb) {
          cb();
        }

        $scope.anr_risks_op_table_loading = false;
      });
    };

    $scope.resetRisksOpFilters = function() {
      $scope.risks_op_filters = {
        order: 'cacheNetRisk',
        order_direction: 'desc',
        thresholds: -1,
        page: 1,
        limit: 20
      };
    };

    $scope.serializeQueryString = function(obj) {
      var str = [];
      for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
      }
      return str.join('&');
    };

    $scope.exportAnrRisksTable = function() {
      var params = angular.copy($scope.risks_filters);
      params.csv = true;
      var anr = 'anr';
      if ($scope.OFFICE_MODE == 'FO') {
        anr = 'client-anr';
      }

      $http.get("api/" + anr + "/" + $scope.model.anr.id + "/risks?" + $scope.serializeQueryString(params)).then(function(data) {
        var contentT = data.headers('Content-Type');
        DownloadService.downloadCSV(data.data, 'risks.csv', contentT);
      });
    }

    $scope.exportAnrRisksOpTable = function() {
      var params = angular.copy($scope.risks_op_filters);
      params.csv = true;
      var anr = 'anr';
      if ($scope.OFFICE_MODE == 'FO') {
        anr = 'client-anr';
      }

      $http.get("api/" + anr + "/" + $scope.model.anr.id + "/risksop?" + $scope.serializeQueryString(params)).then(function(data) {
        var contentT = data.headers('Content-Type');
        DownloadService.downloadCSV(data.data, 'risks_op.csv', contentT);
      });
    }

    $scope.exportInstanceOpTable = function() {
      var params = angular.copy($scope.risks_op_filters);
      params.csv = true;
      var anr = 'anr';
      if ($scope.OFFICE_MODE == 'FO') {
        anr = 'client-anr';
      }

      $http.get("api/" + anr + "/" + $scope.model.anr.id + "/instances/" + $rootScope.anr_selected_instance_id + '?' + $scope.serializeQueryString(params)).then(function(data) {
        var contentT = data.headers('Content-Type');
        DownloadService.downloadCSV(data.data, 'risks_op_inst.csv', contentT);
      });
    }

    $scope.exportInstRisks = function() {
      var params = angular.copy($scope.risks_filters);
      params.csvInfoInst = true;
      var anr = 'anr';
      if ($scope.OFFICE_MODE == 'FO') {
        anr = 'client-anr';
      }

      $http.get("api/" + anr + "/" + $scope.model.anr.id + "/instances/" + $rootScope.anr_selected_instance_id + '?' + $scope.serializeQueryString(params)).then(function(data) {
        var contentT = data.headers('Content-Type');
        DownloadService.downloadCSV(data.data, 'risks_inst.csv', contentT);
      });
    }

    $scope.resetFilters();
    $scope.updateModel();
    $scope.instmode = 'anr';

    $scope.$watchGroup(['risks_filters.order', 'risks_filters.order_direction'], function(newValue, oldValue) {
      if (newValue != oldValue) {
        if ($state.current.name == "main.kb_mgmt.models.details" || $state.current.name == 'main.project.anr') {
          $scope.updateAnrRisksTable();
        } else {
          $scope.$broadcast('risks-table-filters-changed');
        }
      }
    });

    $scope.$watchGroup(['risks_op_filters.order', 'risks_op_filters.order_direction'], function(newValue, oldValue) {
      if (newValue != oldValue) {
        if ($state.current.name == "main.kb_mgmt.models.details" || $state.current.name == 'main.project.anr') {
          $scope.updateAnrRisksOpTable();
        } else {
          $scope.$broadcast('risks-op-table-filters-changed');
        }
      }
    });

    $scope.clearSelectedInstAndObj = function() {
      $rootScope.anr_selected_instance_id = null;
      $rootScope.anr_selected_object_id = null;
    }

    $scope.initializeRiskOwnerSelection = function(sheet) {
      if (!sheet) {
        return;
      }

      var ownerName = sheet.riskOwnerSupervisorName || sheet.owner || '';
      sheet.ownerSearchText = ownerName;
      sheet.ownerSupervisorSelection = sheet.riskOwnerSupervisor || (sheet.riskOwnerSupervisorId ? {
        id: sheet.riskOwnerSupervisorId,
        name: ownerName
      } : null);
    };

    $scope.getLinkedUserDisplayName = function(linkedUser) {
      if (!linkedUser) {
        return '';
      }

      return ((linkedUser.firstname || '') + ' ' + (linkedUser.lastname || '')).trim() || linkedUser.email || '';
    };

    function parseHistoryValue(value) {
      function formatHistoryScaleValue(scaleValue) {
        return scaleValue === -1 || scaleValue === '-1' ? '-' : scaleValue;
      }

      if (value === null || value === undefined || value === '') {
        return '—';
      }

      if (typeof value !== 'string') {
        return '' + value;
      }

      var trimmedValue = value.trim();
      if (trimmedValue === 'hidden' || trimmedValue === 'Hidden') {
        return gettextCatalog.getString('Hidden');
      }
      if (trimmedValue === 'visible' || trimmedValue === 'Visible') {
        return gettextCatalog.getString('Visible');
      }
      if ((trimmedValue.charAt(0) === '{' || trimmedValue.charAt(0) === '[') && trimmedValue.length > 1) {
        try {
          var parsedValue = JSON.parse(trimmedValue);
            if (parsedValue && angular.isObject(parsedValue)) {
              if (angular.isDefined(parsedValue.c) || angular.isDefined(parsedValue.i) || angular.isDefined(parsedValue.a)) {
                var formattedParts = [
                  'C: ' + (angular.isDefined(parsedValue.c) ? formatHistoryScaleValue(parsedValue.c) : '—'),
                  'I: ' + (angular.isDefined(parsedValue.i) ? formatHistoryScaleValue(parsedValue.i) : '—'),
                  'A: ' + (angular.isDefined(parsedValue.a) ? formatHistoryScaleValue(parsedValue.a) : '—')
                ];
              if (angular.isDefined(parsedValue.max)) {
                formattedParts.push('MAX: ' + parsedValue.max);
              }
              if (angular.isDefined(parsedValue.hidden)) {
                formattedParts.push(gettextCatalog.getString(parsedValue.hidden ? 'Hidden' : 'Visible'));
              }
              return formattedParts.join(' / ');
            }
            return angular.toJson(parsedValue);
          }
        } catch (e) {
          return value;
        }
      }

      return value;
    }

    $scope.getHistoryUserDisplay = function(entry) {
      var fullName = (((entry && entry.performedByFirstname) || '') + ' ' + ((entry && entry.performedByLastname) || '')).trim();
      return fullName || (entry && entry.performedByEmail) || '—';
    };

    $scope.getHistoryFieldLabel = function(fieldCode) {
      switch (fieldCode) {
        case 'risk_owner':
          return gettextCatalog.getString('Risk owner');
        case 'risk_source':
          return gettextCatalog.getString('Risk source');
        case 'risk_context':
          return gettextCatalog.getString('Risk context');
        case 'last_review_date':
          return gettextCatalog.getString('Last review date');
        case 'review_frequency':
          return gettextCatalog.getString('Review frequency');
        case 'threat_probability':
          return gettextCatalog.getString('Threat probability');
        case 'vulnerability_qualification':
          return gettextCatalog.getString('Vulnerability qualification');
        case 'current_risk':
          return gettextCatalog.getString('Current risk');
        case 'residual_risk':
          return gettextCatalog.getString('Residual risk');
        case 'treatment_type':
          return gettextCatalog.getString('Treatment');
        case 'vulnerability_reduction':
          return gettextCatalog.getString('Vulnerability reduction');
        case 'residual_acceptance_approver':
          return gettextCatalog.getString('Residual risk acceptance approver');
        case 'residual_acceptance_decision':
          return gettextCatalog.getString('Residual risk acceptance decision');
        case 'residual_acceptance_justification':
          return gettextCatalog.getString('Residual risk acceptance justification');
        case 'residual_acceptance_date':
          return gettextCatalog.getString('Residual risk acceptance date');
        case 'consequence_confidentiality':
          return gettextCatalog.getString('Confidentiality consequence');
        case 'consequence_integrity':
          return gettextCatalog.getString('Integrity consequence');
        case 'consequence_availability':
          return gettextCatalog.getString('Availability consequence');
        case 'consequence_reputation':
          return gettextCatalog.getString('Reputation consequence');
        case 'consequence_legal':
          return gettextCatalog.getString('Legal consequence');
        case 'consequence_financial':
          return gettextCatalog.getString('Financial consequence');
        case 'impact_scale_update':
          return gettextCatalog.getString('Impact scale update');
        default:
          return gettextCatalog.getString('Change');
      }
    };

    $scope.getHistoryChangeLabel = function(entry) {
      if (!entry) {
        return '';
      }

      switch (entry.changeType) {
        case 1:
          return gettextCatalog.getString('Risk created');
        case 20:
          return gettextCatalog.getString('Recommendation linked');
        case 21:
          return gettextCatalog.getString('Recommendation unlinked');
        case 10:
          if (entry.fieldCode === 'impact_scale_update') {
            return gettextCatalog.getString('Impact scale update');
          }
          return gettextCatalog.getString('{{ field }} changed', {
            field: $scope.getHistoryFieldLabel(entry.fieldCode)
          });
        case 30:
          return gettextCatalog.getString('{{ field }} created', {
            field: $scope.getHistoryFieldLabel(entry.fieldCode)
          });
        case 31:
          return gettextCatalog.getString('{{ field }} updated', {
            field: $scope.getHistoryFieldLabel(entry.fieldCode)
          });
        case 32:
          return gettextCatalog.getString('{{ field }} deleted', {
            field: $scope.getHistoryFieldLabel(entry.fieldCode)
          });
        case 33:
          return gettextCatalog.getString('Impact scale update');
        case 40:
        default:
          return gettextCatalog.getString('{{ field }} changed', {
            field: $scope.getHistoryFieldLabel(entry.fieldCode)
          });
      }
    };

    $scope.getHistoryDetails = function(entry) {
      if (!entry) {
        return '';
      }

      if (entry.changeType === 20) {
        return parseHistoryValue(entry.newValue);
      }
      if (entry.changeType === 21) {
        return parseHistoryValue(entry.oldValue);
      }
      if (entry.changeType === 1) {
        return gettextCatalog.getString('Baseline captured');
      }

      var oldValue = parseHistoryValue(entry.oldValue);
      var newValue = parseHistoryValue(entry.newValue);
      if (oldValue === '—') {
        return newValue;
      }
      if (newValue === '—') {
        return oldValue;
      }

      return oldValue + ' → ' + newValue;
    };

    $scope.isHistoryValueLong = function(value) {
      return !!value && ('' + parseHistoryValue(value)).length > 120;
    };

    $scope.toggleHistoryValue = function(entry, key) {
      if (!entry) {
        return;
      }

      entry[key] = !entry[key];
    };

    $scope.getHistoryExpandedValue = function(value) {
      return parseHistoryValue(value);
    };

    function normalizeHistoryChangeTypeFilter(sheet) {
      var selectedChangeType;
      if (!sheet) {
        return 0;
      }

      selectedChangeType = parseInt(sheet.historyChangeTypeFilter, 10);
      if (isNaN(selectedChangeType) || selectedChangeType < 0) {
        selectedChangeType = 0;
      }

      sheet.historyChangeTypeFilter = selectedChangeType;

      return selectedChangeType;
    }

    function buildHistoryQueryParams(sheet, isOperational) {
      var params = {
        targetType: isOperational ? historyTargetTypes.operationalRisk : historyTargetTypes.informationRisk,
        targetId: sheet.id
      };

      var selectedChangeType = normalizeHistoryChangeTypeFilter(sheet);
      if (selectedChangeType > 0) {
        params.changeType = selectedChangeType;
      }

      return params;
    }

    $scope.loadRiskHistory = function(sheet, isOperational) {
      if (!sheet || !sheet.id) {
        return;
      }

      sheet.historyLoading = true;
      AnrService.getHistory($scope.model.anr.id, buildHistoryQueryParams(sheet, isOperational)).then(function(data) {
        sheet.history = data.history || [];
      }).finally(function() {
        sheet.historyLoading = false;
      });
    };

    $scope.onHistoryChangeTypeChange = function(sheet, isOperational) {
      $scope.loadRiskHistory(sheet, isOperational);
    };

    function updateLinkedUserReferences(linkedUser) {
      if (!linkedUser || !linkedUser.id) {
        return;
      }

      [
        $scope.sheet_risk,
        $scope.opsheet_risk
      ].forEach(function(sheet) {
        if (!sheet) {
          return;
        }

        [
          'riskOwnerSupervisor',
          'residualAcceptanceApproverSupervisor',
          'residualAcceptanceApproverSupervisorSelection'
        ].forEach(function(field) {
          if (sheet[field] && sheet[field].linkedUser && sheet[field].linkedUser.id == linkedUser.id) {
            sheet[field].linkedUser = angular.copy(linkedUser);
          }
        });
      });
    }

    $scope.openLinkedUserAccount = function(linkedUserId, ev) {
      if (!linkedUserId || !$scope.canManageSupervisorLinkedUsers()) {
        return;
      }

      var ClientUsersService = $injector.get('ClientUsersService');
      var ClientAnrService = $injector.get('ClientAnrService');

      ClientUsersService.getUser(linkedUserId).then(function(userData) {
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

        $mdDialog.show({
          controller: ['$scope', '$mdDialog', 'ClientAnrService', 'user', EditLinkedUserDialogCtrl],
          templateUrl: 'views/dialogs/create.user.html',
          targetEvent: ev,
          scope: $scope.$dialogScope.$new(),
          clickOutsideToClose: false,
          fullscreen: useFullScreen,
          locals: {
            ClientAnrService: ClientAnrService,
            user: userData
          }
        }).then(function(user) {
          ClientUsersService.patchUser(user.id, user, function() {
            updateLinkedUserReferences(user);
            toastr.success(gettextCatalog.getString('The user has been edited successfully.',
              {firstname: user.firstname, lastname: user.lastname}), gettextCatalog.getString('Edition successful'));

            if (user.id == UserService.getUserId()) {
              $rootScope.$broadcast('fo-anr-changed');
            }
          });
        }, function(reject) {
          $scope.handleRejectionDialog(reject);
        });
      }, function(error) {
        $scope.handleRejectionDialog(error);
      });
    };

    var applyRiskSheetData = function(risk, risks) {
      $scope.risks_instance = risks;
      $scope.ToolsAnrService.currentTab = 0;
      $scope.opsheet_risk = undefined;
      $scope.sheet_risk = angular.copy(risk);
      var currentSheetRisk = $scope.sheet_risk;
      var mainContent = document.querySelector('md-content.md-main-content');
      if (mainContent) mainContent.scrollTop = 0;
      $scope.initializeRiskOwnerSelection($scope.sheet_risk);
      $scope.initializeRiskReviewFields($scope.sheet_risk);
      $scope.updateSheetRiskSourceLabel();
      $scope.loadRiskSources();
      $scope.loadRiskHistory($scope.sheet_risk, false);

      AmvService.getAmv(currentSheetRisk.amv).then(function(data) {
        if ($scope.sheet_risk !== currentSheetRisk) {
          return;
        }

        if (!angular.equals(data['measures'], {})) {
          currentSheetRisk.measures = data['measures'];
        } else {
          currentSheetRisk.measures = [];
        }
      });

      var reducAmount = [];
      if ($scope.scales.vulns != undefined) {
        for (var i = $scope.scales.vulns.min; i <= $scope.scales.vulns.max; i++) {
          reducAmount.push(i);
          if ($scope.sheet_risk.vulnerabilityRate != '-1' && i == $scope.sheet_risk.vulnerabilityRate) {
            break;
          }
        }
      }
      $scope.reducAmount = reducAmount;
      $scope._copyRecs = [];
      if ($scope.OFFICE_MODE == 'FO') {
        $scope.idxRisks = risks.findIndex(infoRisk => infoRisk.id == $stateParams.riskId);
      } else {
        $scope.idxRisks = risks.findIndex(infoRisk => infoRisk.id == risk.id);
      }
      $scope.updateSheetRiskTarget();
    };

    var applyOpRiskSheetData = function(risk, oprisks) {
      $scope.opRisks_instance = oprisks;
      $scope.ToolsAnrService.currentTab = 1;
      $scope.sheet_risk = undefined;
      $scope.opsheet_risk = angular.copy(risk);
      var currentOpSheetRisk = $scope.opsheet_risk;
      var mainContent = document.querySelector('md-content.md-main-content');
      if (mainContent) mainContent.scrollTop = 0;
      $scope.initializeRiskOwnerSelection($scope.opsheet_risk);
      $scope.loadRiskSourcesForOperationalSheet();
      $scope.loadRiskHistory($scope.opsheet_risk, true);

      RiskService.getRisk(currentOpSheetRisk.rolfRisk).then(function(data) {
        if ($scope.opsheet_risk !== currentOpSheetRisk) {
          return;
        }

        if (!angular.equals(data['measures'], {})) {
          currentOpSheetRisk.measures = data['measures'];
        } else {
          currentOpSheetRisk.measures = [];
        }
      });

      $scope._copyRecs = [];
      if ($scope.OFFICE_MODE == 'FO') {
        $scope.initializeRiskReviewFields($scope.opsheet_risk);
        $scope.idxOpRisks = oprisks.findIndex(oprisk => oprisk.id == $stateParams.riskopId);
      } else {
        $scope.idxOpRisks = oprisks.findIndex(oprisk => oprisk.rolfRisk == risk.rolfRisk);
      }
    };

    $scope.openRiskSheet = function(risk, risks) {
      $scope.risks_instance = risks;
      if ($scope.OFFICE_MODE == 'FO') {
        if ($stateParams.instId) {
          $state.transitionTo('main.project.anr.instance.risk', {
            modelId: $stateParams.modelId,
            instId: $stateParams.instId,
            riskId: risk.id
          }, {
            inherit: true,
            notify: true,
            reload: false,
            location: 'replace'
          });
        } else {
          $state.transitionTo('main.project.anr.risk', {
            modelId: $stateParams.modelId,
            riskId: risk.id
          }, {
            inherit: true,
            notify: true,
            reload: false,
            location: 'replace'
          });
        }
      }
      $timeout(function() {
        applyRiskSheetData(risk, risks);
      });
    };

    $scope.selectReferential = function(referentialId) {
      $scope.referential_uuid = referentialId;
    };

    $scope.selectRecommendationSet = function(recommendationSetId) {
      $scope.recommendation_set_uuid = recommendationSetId;
    };

    $scope.updateSheetRiskTarget = function() {
      if ($scope.sheet_risk) {
        if (parseInt($scope.sheet_risk.threatRate) > -1 && parseInt($scope.sheet_risk.vulnerabilityRate) > -1) {
          $scope.sheet_risk.target_c = $scope.sheet_risk.c_impact * $scope.sheet_risk.threatRate * ($scope.sheet_risk.vulnerabilityRate - $scope.sheet_risk.reductionAmount);
          $scope.sheet_risk.target_i = $scope.sheet_risk.i_impact * $scope.sheet_risk.threatRate * ($scope.sheet_risk.vulnerabilityRate - $scope.sheet_risk.reductionAmount);
          $scope.sheet_risk.target_d = $scope.sheet_risk.d_impact * $scope.sheet_risk.threatRate * ($scope.sheet_risk.vulnerabilityRate - $scope.sheet_risk.reductionAmount);
        } else {
          $scope.sheet_risk.target_c = $scope.sheet_risk.target_i = $scope.sheet_risk.target_d = "-";
        }
      }
    };

    $scope.resetSheet = function(redir) {
      if ($scope.sheet_risk) {
        if ($scope.OFFICE_MODE == 'FO') {
          if (!redir) {
            $scope.saveRiskSheet($scope.sheet_risk);
            if ($stateParams.instId) {
              $state.transitionTo('main.project.anr.instance', {
                modelId: $stateParams.modelId,
                instId: $stateParams.instId
              }, {
                inherit: true,
                notify: true,
                reload: false,
                location: 'replace'
              });
            } else {
              $state.transitionTo('main.project.anr', {
                modelId: $stateParams.modelId
              }, {
                inherit: true,
                notify: false,
                reload: false,
                location: 'replace'
              });
            }
          }
        }

        $timeout(function() {
          if ($state.$current.name !== 'main.project.anr.instance.risk') {
            $scope.sheet_risk = undefined;
          }
        });
      }
    };

    $scope.openOpRiskSheet = function(risk, oprisks) {
      $scope.opRisks_instance = oprisks;
      if ($scope.OFFICE_MODE == 'FO') {
        if ($stateParams.instId) {
          $state.transitionTo('main.project.anr.instance.riskop', {
            modelId: $stateParams.modelId,
            instId: $stateParams.instId,
            riskopId: risk.id
          }, {
            inherit: true,
            notify: true,
            reload: false,
            location: 'replace'
          });
        } else {
          $state.transitionTo('main.project.anr.riskop', {
            modelId: $stateParams.modelId,
            riskopId: risk.id
          }, {
            inherit: true,
            notify: true,
            reload: false,
            location: 'replace'
          });
        }
        $scope.idxOpRisks = oprisks.findIndex(oprisk => oprisk.id == $stateParams.riskopId);
      } else {
        $scope.idxOpRisks = oprisks.findIndex(oprisk => oprisk.rolfRisk == risk.rolfRisk);
      }

      $timeout(function() {
        applyOpRiskSheetData(risk, oprisks);
      });
    };

    $scope.resetOpSheet = function(redir) {
      if ($scope.opsheet_risk) {
        if ($scope.OFFICE_MODE == 'FO') {
          $scope.saveOpRiskSheet($scope.opsheet_risk);
          if (!redir) {
            if ($stateParams.instId) {
              $state.transitionTo('main.project.anr.instance', {
                modelId: $stateParams.modelId,
                instId: $stateParams.instId
              }, {
                inherit: true,
                notify: true,
                reload: false,
                location: 'replace'
              });
            } else {
              $state.transitionTo('main.project.anr.riskop', {
                modelId: $stateParams.modelId
              }, {
                inherit: true,
                notify: false,
                reload: false,
                location: 'replace'
              });
            }
          }
        }
        $timeout(function() {
          if ($state.$current.name !== 'main.project.anr.instance.riskop') {
            $scope.opsheet_risk = undefined;
          }
        });
      }
    };

    $scope.$watch('sheet_risk.reductionAmount', function() {
      if ($state.$current.name == 'main.project.anr.instance.risk' || $state.$current.name == 'main.project.anr.risk') {
        $scope.updateSheetRiskTarget();
      }
    });

    $scope.$watch('sheet_risk.kindOfMeasure', function(newValue) {
      if ($state.$current.name == 'main.project.anr.instance.risk' || $state.$current.name == 'main.project.anr.risk') {
        if (newValue == 5 || newValue == 3) {
          $scope.sheet_risk.reductionAmount = 0;
          $scope.reductionVuln = false;
        } else {
          $scope.reductionVuln = true;
        }
      }
    });

    $scope.treatmentStr = function(treatment) {
      switch (parseInt(treatment)) {
        case 1:
          return 'Reduction';
        case 2:
          return 'Denied';
        case 3:
          return 'Accepted';
        case 4:
          return 'Shared';
        default:
          return 'Not treated';
      }
    };

    $scope.previousRisk = function() {
      if (!$scope.risks_instance || $scope.idxRisks <= 0) {
        return;
      }
      $scope.reducAmount = [];
      let currentRisk = $scope.sheet_risk;
      let previousRisk = $scope.risks_instance[$scope.idxRisks - 1];
      $scope.risks_instance[$scope.idxRisks] = currentRisk;
      $scope.saveRiskSheet(currentRisk);
      $scope.openRiskSheet(previousRisk, $scope.risks_instance);
    };

    $scope.nextRisk = function() {
      if (!$scope.risks_instance || $scope.idxRisks >= $scope.risks_instance.length - 1) {
        return;
      }
      $scope.reducAmount = [];
      let currentRisk = $scope.sheet_risk;
      let nextRisk = $scope.risks_instance[$scope.idxRisks + 1];
      $scope.risks_instance[$scope.idxRisks] = currentRisk;
      $scope.saveRiskSheet(currentRisk);
      $scope.openRiskSheet(nextRisk, $scope.risks_instance);
    };

    $scope.previousOpRisk = function() {
      if (!$scope.opRisks_instance || $scope.idxOpRisks <= 0) {
        return;
      }
      let currentOpRisk = $scope.opsheet_risk;
      let previousOpRisk = $scope.opRisks_instance[$scope.idxOpRisks - 1];
      $scope.opRisks_instance[$scope.idxOpRisks] = currentOpRisk;
      $scope.saveOpRiskSheet(currentOpRisk);
      $scope.openOpRiskSheet(previousOpRisk, $scope.opRisks_instance);
    };

    $scope.nextOpRisk = function() {
      if (!$scope.opRisks_instance || $scope.idxOpRisks >= $scope.opRisks_instance.length - 1) {
        return;
      }
      let currentOpRisk = $scope.opsheet_risk;
      let nextOpRisk = $scope.opRisks_instance[$scope.idxOpRisks + 1];
      $scope.opRisks_instance[$scope.idxOpRisks] = currentOpRisk;
      $scope.saveOpRiskSheet(currentOpRisk);
      $scope.openOpRiskSheet(nextOpRisk, $scope.opRisks_instance);
    };

    $scope.saveRiskSheet = function(sheet) {
      if (!$scope.canSaveRiskSheetFields(sheet)) {
        return;
      }

      if ($scope.hasPendingRiskOwnerRemoval(sheet)) {
        $scope.onRiskOwnerSelected(sheet, null, {
          force: true
        });
        return;
      }

      $scope.applyResidualAcceptanceState(sheet);
      var payload = $scope.isAnrReadOnly
        ? $scope.buildDelegatedRiskSheetPayload(sheet)
        : $scope.buildRiskSheetPayload(sheet);
      if (!Object.keys(payload).length) {
        return;
      }

      var saveRequest = $scope.isAnrReadOnly
        ? AnrService.patchInstanceRisk
        : AnrService.updateInstanceRisk;

      saveRequest($scope.model.anr.id, sheet.id, payload, function(response) {
        sheet.owner = response.owner;
        sheet.riskOwnerSupervisor = response.riskOwnerSupervisor || null;
        sheet.riskOwnerSupervisorId = response.riskOwnerSupervisorId;
        sheet.riskOwnerSupervisorName = response.riskOwnerSupervisorName;
        sheet.lastReviewDate = response.lastReviewDate;
        sheet.reviewFrequency = response.reviewFrequency;
        $scope.applyResidualRiskDecisionResponse(sheet, response);
        $scope.initializeRiskOwnerSelection(sheet);
        $scope.initializeRiskReviewFields(sheet);
        $scope.$broadcast('risks-table-edited');
        $scope.updateAnrRisksTable();
        $scope.updateSheetRiskTarget();
        $scope.loadRiskHistory(sheet, false);
      });
    };

    $scope.saveOpRiskSheet = function(sheet) {
      if (!$scope.canSaveRiskSheetFields(sheet)) {
        return;
      }

      if ($scope.hasPendingRiskOwnerRemoval(sheet)) {
        $scope.onRiskOwnerSelected(sheet, null, {
          force: true
        });
        return;
      }

      $scope.applyResidualAcceptanceState(sheet);
      var payload = $scope.isAnrReadOnly
        ? $scope.buildDelegatedRiskSheetPayload(sheet)
        : $scope.buildOpRiskSheetPayload(sheet);
      if (!Object.keys(payload).length) {
        return;
      }

      var saveRequest = $scope.isAnrReadOnly
        ? AnrService.patchInstanceOpRisk
        : AnrService.updateInstanceOpRisk;

      saveRequest($scope.model.anr.id, sheet.id, payload, function(response) {
        sheet.owner = response.owner;
        sheet.riskOwnerSupervisor = response.riskOwnerSupervisor || null;
        sheet.riskOwnerSupervisorId = response.riskOwnerSupervisorId;
        sheet.riskOwnerSupervisorName = response.riskOwnerSupervisorName;
        sheet.riskSourceId = response.riskSourceId;
        sheet.riskSourceLabel = response.riskSourceLabel;
        sheet.lastReviewDate = response.lastReviewDate;
        sheet.reviewFrequency = response.reviewFrequency;
        $scope.applyResidualRiskDecisionResponse(sheet, response);
        $scope.initializeRiskOwnerSelection(sheet);
        $scope.initializeRiskReviewFields(sheet);
        $scope.$broadcast('risks-table-edited');
        $scope.updateAnrRisksOpTable();
        $scope.loadRiskHistory(sheet, true);
      });
    };

    $scope.buildOpRiskSheetPayload = function(sheet) {
      var payload = angular.copy(sheet);
      var ownerName = ((sheet.ownerSearchText || '') + '').trim();
      payload.riskOwnerSupervisorId = null;
      if (sheet.ownerSupervisorSelection && sheet.ownerSupervisorSelection.id) {
        payload.riskOwnerSupervisorId = sheet.ownerSupervisorSelection.id;
      } else if (sheet.riskOwnerSupervisorId && ownerName === (sheet.riskOwnerSupervisorName || '').trim()) {
        payload.riskOwnerSupervisorId = sheet.riskOwnerSupervisorId;
      }
      payload.lastReviewDate = $scope.formatDateValue(sheet.lastReviewDateValue);
      payload.reviewFrequency = $scope.buildReviewFrequencyValue(sheet);
      angular.extend(payload, $scope.buildResidualAcceptancePayload(sheet));
      delete payload.owner;
      delete payload.ownerSearchText;
      delete payload.ownerSupervisorSelection;
      delete payload.riskOwnerSupervisor;
      delete payload.lastReviewDateValue;
      delete payload.residualRiskDecidedAtValue;
      delete payload.residualAcceptanceApproverSupervisor;
      delete payload.residualAcceptanceApproverSupervisorSelection;
      delete payload.residualAcceptanceApproverSearchText;
      delete payload.residualAcceptancePerformerTouched;
      delete payload.residualRiskDecidedBySupervisor;
      delete payload.residualRiskDecidedBySupervisorId;
      delete payload.residualRiskDecidedByUserId;
      delete payload.residualRiskDecidedByName;
      delete payload.reviewFrequencyOption;
      delete payload.reviewFrequencyCustom;
      delete payload._residualAcceptanceSnapshot;
      delete payload._skipRiskOwnerSelectionChange;

      return payload;
    };

    $scope.loadRiskSources = function(cb) {
      RiskSourceService.getRiskSources({
        status: true
      }).then(function(data) {
        $scope.riskSources = (data.riskSources || []).sort(function(a, b) {
          return a.label.localeCompare(b.label);
        });
        $scope.ensureSelectedRiskSourceAvailable(cb);
      }, function() {
        if (cb) {
          cb();
        }
      });
    };

    $scope.ensureSelectedRiskSourceAvailable = function(cb) {
      if (!$scope.sheet_risk) {
        if (cb) {
          cb();
        }
        return;
      }

      var selectedRiskSourceId = $scope.sheet_risk.riskSourceId;

      var hasSelectedRiskSource = $scope.riskSources.some(function(riskSource) {
        return riskSource.id == selectedRiskSourceId;
      });

      if (!selectedRiskSourceId || hasSelectedRiskSource) {
        $scope.updateSheetRiskSourceLabel();
        if (cb) {
          cb();
        }
        return;
      }

      RiskSourceService.getRiskSource(selectedRiskSourceId).then(function(riskSource) {
        if (riskSource && !$scope.riskSources.some(function(source) {
          return source.id == riskSource.id;
        })) {
          $scope.riskSources.push(riskSource);
          $scope.riskSources.sort(function(a, b) {
            return a.label.localeCompare(b.label);
          });
        }

        $scope.updateSheetRiskSourceLabel();
        if (cb) {
          cb();
        }
      }, function() {
        $scope.updateSheetRiskSourceLabel();
        if (cb) {
          cb();
        }
      });
    };

    $scope.updateSheetRiskSourceLabel = function() {
      if (!$scope.sheet_risk) {
        return;
      }

      var selectedRiskSourceId = $scope.sheet_risk.riskSourceId;

      var selectedRiskSource = $scope.riskSources.find(function(riskSource) {
        return riskSource.id == selectedRiskSourceId;
      });

      if (selectedRiskSource) {
        $scope.sheet_risk.riskSourceId = selectedRiskSource.id;
        $scope.sheet_risk.riskSourceLabel = selectedRiskSource.label;
      } else if (selectedRiskSourceId === null || selectedRiskSourceId === '' || selectedRiskSourceId === undefined) {
        $scope.clearRiskSourceSelection();
      }
    };

    $scope.clearRiskSourceSelection = function() {
      if (!$scope.sheet_risk) {
        return;
      }

      $scope.sheet_risk.riskSourceId = null;
      $scope.sheet_risk.riskSourceLabel = '';
    };

    $scope.loadRiskSourcesForOperationalSheet = function(cb) {
      RiskSourceService.getRiskSources({
        status: true
      }).then(function(data) {
        $scope.riskSources = (data.riskSources || []).sort(function(a, b) {
          return a.label.localeCompare(b.label);
        });
        $scope.ensureSelectedOperationalRiskSourceAvailable(cb);
      }, function() {
        if (cb) {
          cb();
        }
      });
    };

    $scope.ensureSelectedOperationalRiskSourceAvailable = function(cb) {
      if (!$scope.opsheet_risk) {
        if (cb) {
          cb();
        }
        return;
      }

      var selectedRiskSourceId = $scope.opsheet_risk.riskSourceId;
      var hasSelectedRiskSource = $scope.riskSources.some(function(riskSource) {
        return riskSource.id == selectedRiskSourceId;
      });

      if (!selectedRiskSourceId || hasSelectedRiskSource) {
        $scope.updateOperationalSheetRiskSourceLabel();
        if (cb) {
          cb();
        }
        return;
      }

      RiskSourceService.getRiskSource(selectedRiskSourceId).then(function(riskSource) {
        if (riskSource && !$scope.riskSources.some(function(source) {
          return source.id == riskSource.id;
        })) {
          $scope.riskSources.push(riskSource);
          $scope.riskSources.sort(function(a, b) {
            return a.label.localeCompare(b.label);
          });
        }

        $scope.updateOperationalSheetRiskSourceLabel();
        if (cb) {
          cb();
        }
      }, function() {
        $scope.updateOperationalSheetRiskSourceLabel();
        if (cb) {
          cb();
        }
      });
    };

    $scope.updateOperationalSheetRiskSourceLabel = function() {
      if (!$scope.opsheet_risk) {
        return;
      }

      var selectedRiskSourceId = $scope.opsheet_risk.riskSourceId;
      var selectedRiskSource = $scope.riskSources.find(function(riskSource) {
        return riskSource.id == selectedRiskSourceId;
      });

      if (selectedRiskSource) {
        $scope.opsheet_risk.riskSourceId = selectedRiskSource.id;
        $scope.opsheet_risk.riskSourceLabel = selectedRiskSource.label;
      } else if (selectedRiskSourceId === null || selectedRiskSourceId === '' || selectedRiskSourceId === undefined) {
        $scope.clearOperationalRiskSourceSelection();
      }
    };

    $scope.clearOperationalRiskSourceSelection = function() {
      if (!$scope.opsheet_risk) {
        return;
      }

      $scope.opsheet_risk.riskSourceId = null;
      $scope.opsheet_risk.riskSourceLabel = '';
    };

    $scope.initializeRiskReviewFields = function(sheet) {
      if (!sheet) {
        return;
      }

      sheet.lastReviewDateValue = $scope.parseDateValue(sheet.lastReviewDate);
      sheet.residualRiskDecidedAtValue = $scope.parseDateValue(sheet.residualRiskDecidedAt);
      sheet.residualAcceptanceApproverSupervisorSelection = sheet.residualAcceptanceApproverSupervisor || null;
      sheet.residualAcceptanceApproverSearchText = sheet.residualAcceptanceApproverSupervisor
        ? (sheet.residualAcceptanceApproverSupervisor.name || '')
        : '';
      $scope.applyResidualAcceptanceState(sheet, {
        preserveDecisionFields: true
      });
      $scope.syncReviewFrequencyState(sheet);
      $scope.captureResidualAcceptanceSnapshot(sheet);
    };

    $scope.syncReviewFrequencyState = function(sheet) {
      if (!sheet) {
        return;
      }

      var reviewFrequency = sheet.reviewFrequency || '';
      if (!reviewFrequency) {
        sheet.reviewFrequencyOption = null;
        sheet.reviewFrequencyCustom = '';
        return;
      }

      if (reviewFrequencyValues.indexOf(reviewFrequency) !== -1) {
        sheet.reviewFrequencyOption = reviewFrequency;
        sheet.reviewFrequencyCustom = '';
        return;
      }

      sheet.reviewFrequencyOption = reviewFrequencyOtherValue;
      sheet.reviewFrequencyCustom = reviewFrequency;
    };

    $scope.buildResidualAcceptancePayload = function(sheet) {
      var payload = {
        residualAcceptanceUseRiskOwner: !!sheet.residualAcceptanceUseRiskOwner,
        residualAcceptanceApproverSupervisorId: null
      };
      var effectiveApprover = $scope.getEffectiveResidualApprover(sheet);
      if (!sheet.residualAcceptanceUseRiskOwner && effectiveApprover && effectiveApprover.id) {
        payload.residualAcceptanceApproverSupervisorId = effectiveApprover.id;
      }

      var currentState = {
        residualRiskDecision: sheet.residualRiskDecision || null,
        residualRiskDecidedAt: $scope.formatDateValue(sheet.residualRiskDecidedAtValue),
        residualRiskJustification: (sheet.residualRiskJustification || '').trim() || null,
        residualAcceptancePerformedByName: sheet.residualAcceptancePerformedByName || null,
        residualAcceptancePerformedByEmail: sheet.residualAcceptancePerformedByEmail || null,
        residualAcceptancePerformedOnBehalf: !!sheet.residualAcceptancePerformedOnBehalf
      };
      var snapshot = sheet._residualAcceptanceSnapshot || {};

      Object.keys(currentState).forEach(function(field) {
        if (currentState[field] !== (snapshot[field] === undefined ? null : snapshot[field])) {
          payload[field] = currentState[field];
        }
      });

      if (sheet.residualAcceptancePerformerTouched) {
        payload.residualAcceptancePerformedByName = currentState.residualAcceptancePerformedByName;
        payload.residualAcceptancePerformedByEmail = currentState.residualAcceptancePerformedByEmail;
        payload.residualAcceptancePerformedOnBehalf = currentState.residualAcceptancePerformedOnBehalf;
      }

      return payload;
    };

    $scope.buildRiskSheetPayload = function(sheet) {
      var payload = angular.copy(sheet);
      var ownerName = ((sheet.ownerSearchText || '') + '').trim();
      payload.riskOwnerSupervisorId = null;
      if (sheet.ownerSupervisorSelection && sheet.ownerSupervisorSelection.id) {
        payload.riskOwnerSupervisorId = sheet.ownerSupervisorSelection.id;
      } else if (sheet.riskOwnerSupervisorId && ownerName === (sheet.riskOwnerSupervisorName || '').trim()) {
        payload.riskOwnerSupervisorId = sheet.riskOwnerSupervisorId;
      }
      payload.lastReviewDate = $scope.formatDateValue(sheet.lastReviewDateValue);
      payload.reviewFrequency = $scope.buildReviewFrequencyValue(sheet);
      angular.extend(payload, $scope.buildResidualAcceptancePayload(sheet));
      delete payload.owner;
      delete payload.ownerSearchText;
      delete payload.ownerSupervisorSelection;
      delete payload.riskOwnerSupervisor;
      delete payload.lastReviewDateValue;
      delete payload.residualRiskDecidedAtValue;
      delete payload.residualAcceptanceApproverSupervisor;
      delete payload.residualAcceptanceApproverSupervisorSelection;
      delete payload.residualAcceptanceApproverSearchText;
      delete payload.residualAcceptancePerformerTouched;
      delete payload.residualRiskDecidedBySupervisor;
      delete payload.residualRiskDecidedBySupervisorId;
      delete payload.residualRiskDecidedByUserId;
      delete payload.residualRiskDecidedByName;
      delete payload.reviewFrequencyOption;
      delete payload.reviewFrequencyCustom;
      delete payload._residualAcceptanceSnapshot;
      delete payload._skipRiskOwnerSelectionChange;

      return payload;
    };

    $scope.buildReviewFrequencyValue = function(sheet) {
      if (!sheet || !sheet.reviewFrequencyOption) {
        return null;
      }

      if (sheet.reviewFrequencyOption === reviewFrequencyOtherValue) {
        var customReviewFrequency = (sheet.reviewFrequencyCustom || '').trim();
        return customReviewFrequency === '' ? null : customReviewFrequency;
      }

      return sheet.reviewFrequencyOption;
    };

    $scope.buildDelegatedRiskSheetPayload = function(sheet) {
      var payload = {};

      if ($scope.canCurrentUserEditMonitoringAndReview(sheet)) {
        payload.lastReviewDate = $scope.formatDateValue(sheet.lastReviewDateValue);
        payload.reviewFrequency = $scope.buildReviewFrequencyValue(sheet);
      }

      if ($scope.canCurrentUserDecideResidualRisk(sheet)) {
        var residualPayload = $scope.buildResidualAcceptancePayload(sheet);
        delete residualPayload.residualAcceptanceUseRiskOwner;
        delete residualPayload.residualAcceptanceApproverSupervisorId;
        angular.extend(payload, residualPayload);
      }

      return payload;
    };

    $scope.parseDateValue = function(dateValue) {
      if (!dateValue) {
        return null;
      }

      var parts = dateValue.split('-');
      if (parts.length !== 3) {
        return null;
      }

      return new Date(parts[0], parts[1] - 1, parts[2]);
    };

    $scope.formatDateValue = function(dateValue) {
      if (!dateValue) {
        return null;
      }

      var reviewDate = new Date(dateValue);
      if (isNaN(reviewDate.getTime())) {
        return null;
      }

      var year = reviewDate.getFullYear();
      var month = String(reviewDate.getMonth() + 1).padStart(2, '0');
      var day = String(reviewDate.getDate()).padStart(2, '0');

      return year + '-' + month + '-' + day;
    };

    $scope.clearLastReviewDate = function(sheet) {
      if (!sheet) {
        return;
      }

      sheet.lastReviewDateValue = null;
    };

    $scope.clearResidualRiskDecisionDate = function(sheet) {
      if (!sheet) {
        return;
      }

      sheet.residualRiskDecidedAtValue = null;
    };

    $scope.openReassessmentTriggersDialog = function(ev) {
      if ($scope.OFFICE_MODE !== 'FO') {
        return;
      }

      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
        controller: [
          '$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'ReassessmentTriggerService',
          'isAnrReadOnly', ReassessmentTriggersDialog
        ],
        templateUrl: 'views/anr/reassessment-triggers.html',
        targetEvent: ev,
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
        locals: {
          ReassessmentTriggerService: ReassessmentTriggerService,
          isAnrReadOnly: $scope.isAnrReadOnly
        }
      }).then(function() {
      }, function(reject) {
        $scope.handleRejectionDialog(reject);
      });
    };

    $scope.openSupervisorsDialog = function(ev) {
      if ($scope.OFFICE_MODE !== 'FO') {
        return;
      }

      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
        controller: [
          '$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'AnrService', 'anr', 'isAnrReadOnly',
          'canManageLinkedUsers',
          SupervisorsDialog
        ],
        templateUrl: 'views/supervisors.html',
        targetEvent: ev,
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
        locals: {
          AnrService: AnrService,
          anr: $scope.model.anr,
          isAnrReadOnly: $scope.isAnrReadOnly,
          canManageLinkedUsers: $scope.canManageSupervisorLinkedUsers()
        }
      }).then(function() {
      }, function(reject) {
        $scope.handleRejectionDialog(reject);
      });
    };

    $scope.createRiskSourceFromSheet = function(ev) {
      if ($scope.isAnrReadOnly || !$scope.sheet_risk) {
        return;
      }

      var prompt = $mdDialog.prompt()
        .title(gettextCatalog.getString('Add a risk source'))
        .placeholder(gettextCatalog.getString('Risk source label'))
        .ariaLabel(gettextCatalog.getString('Risk source label'))
        .theme('light')
        .targetEvent(ev)
        .required(true)
        .ok(gettextCatalog.getString('Create'))
        .cancel(gettextCatalog.getString('Cancel'));

      $mdDialog.show(prompt.multiple(true)).then(function(label) {
        var trimmedLabel = label.trim();
        var existingRiskSource = $scope.riskSources.find(function(riskSource) {
          return riskSource.label.toLowerCase() === trimmedLabel.toLowerCase();
        });

        if (existingRiskSource) {
          $scope.sheet_risk.riskSourceId = existingRiskSource.id;
          $scope.updateSheetRiskSourceLabel();
          return;
        }

        RiskSourceService.createRiskSource({
          label: trimmedLabel
        }, function(riskSource) {
          $scope.riskSources.push(riskSource);
          $scope.riskSources.sort(function(a, b) {
            return a.label.localeCompare(b.label);
          });
          $scope.sheet_risk.riskSourceId = riskSource.id;
          $scope.updateSheetRiskSourceLabel();
        });
      }, function(reject) {
        $scope.handleRejectionDialog(reject);
      });
    };

    $scope.createRiskSourceFromOperationalSheet = function(ev) {
      if ($scope.isAnrReadOnly || !$scope.opsheet_risk) {
        return;
      }

      var prompt = $mdDialog.prompt()
        .title(gettextCatalog.getString('Add a risk source'))
        .placeholder(gettextCatalog.getString('Risk source label'))
        .ariaLabel(gettextCatalog.getString('Risk source label'))
        .theme('light')
        .targetEvent(ev)
        .required(true)
        .ok(gettextCatalog.getString('Create'))
        .cancel(gettextCatalog.getString('Cancel'));

      $mdDialog.show(prompt.multiple(true)).then(function(label) {
        var trimmedLabel = label.trim();
        var existingRiskSource = $scope.riskSources.find(function(riskSource) {
          return riskSource.label.toLowerCase() === trimmedLabel.toLowerCase();
        });

        if (existingRiskSource) {
          $scope.opsheet_risk.riskSourceId = existingRiskSource.id;
          $scope.updateOperationalSheetRiskSourceLabel();
          return;
        }

        RiskSourceService.createRiskSource({
          label: trimmedLabel
        }, function(riskSource) {
          $scope.riskSources.push(riskSource);
          $scope.riskSources.sort(function(a, b) {
            return a.label.localeCompare(b.label);
          });
          $scope.opsheet_risk.riskSourceId = riskSource.id;
          $scope.updateOperationalSheetRiskSourceLabel();
        });
      }, function(reject) {
        $scope.handleRejectionDialog(reject);
      });
    };

    var ownerSearchRequestId = 0;

    $scope.applyRiskOwnerSelection = function(sheet, item) {
      if (!sheet || !$scope.canCurrentUserEditRiskOwner(sheet)) {
        return;
      }

      if (!item) {
        if (!((sheet.ownerSearchText || '').trim())) {
          sheet.owner = '';
          sheet.riskOwnerSupervisor = null;
          sheet.riskOwnerSupervisorId = null;
          sheet.riskOwnerSupervisorName = '';
          sheet.ownerSupervisorSelection = null;
          $scope.applyResidualAcceptanceState(sheet);
        }
        return;
      }

      sheet.owner = item.name;
      sheet.riskOwnerSupervisor = item;
      sheet.riskOwnerSupervisorId = item.id;
      sheet.riskOwnerSupervisorName = item.name;
      sheet.ownerSearchText = item.name;
      $scope.applyResidualAcceptanceState(sheet, {
        preserveDecisionFields: true
      });
    };

    $scope.onRiskOwnerFocus = function(sheet) {
      if (!sheet) {
        return;
      }

      sheet._riskOwnerInputFocused = true;
    };

    $scope.onRiskOwnerBlur = function(sheet) {
      if (!sheet || !$scope.canCurrentUserEditRiskOwner(sheet) || sheet._riskOwnerChangeDialogOpen) {
        return;
      }

      sheet._riskOwnerInputFocused = false;

      if (((sheet.ownerSearchText || '').trim()) !== '' || !sheet.riskOwnerSupervisorId) {
        return;
      }

      $scope.onRiskOwnerSelected(sheet, null, {
        force: true
      });
    };

    $scope.onRiskOwnerSelected = function(sheet, item, options) {
      if (!sheet || !$scope.canCurrentUserEditRiskOwner(sheet)) {
        return;
      }

      if (sheet._skipRiskOwnerSelectionChange) {
        sheet._skipRiskOwnerSelectionChange = false;
        return;
      }

      if (!item && sheet._riskOwnerInputFocused && !(options && options.force)) {
        return;
      }

      var previousRiskOwnerSupervisor = sheet.riskOwnerSupervisor || null;
      var previousRiskOwnerName = sheet.riskOwnerSupervisorName || sheet.owner || '';
      var nextRiskOwnerSupervisorId = item && item.id ? item.id : null;
      var shouldResetResidualDecision = $scope.shouldResetResidualDecisionAfterRiskOwnerChange(
        sheet,
        nextRiskOwnerSupervisorId
      );
      var shouldWarnRiskOwnerRemoval = $scope.shouldWarnRiskOwnerRemoval(sheet, nextRiskOwnerSupervisorId);
      if (!$scope.shouldConfirmRiskOwnerChange(sheet, nextRiskOwnerSupervisorId)) {
        $scope.applyRiskOwnerSelection(sheet, item);
        if (!item && previousRiskOwnerSupervisor) {
          $scope.resetResidualAcceptanceAfterRiskOwnerChange(sheet);
        }
        return;
      }

      var confirm = $mdDialog.confirm()
        .title(gettextCatalog.getString(shouldWarnRiskOwnerRemoval
          ? 'The removal of Risk Owner will lead to the residual risk acceptance decision approver removal.'
          : 'Changing the Risk Owner will reset the residual risk acceptance information. Continue?'
        ))
        .multiple(true)
        .ok(gettextCatalog.getString('Confirm?'))
        .cancel(gettextCatalog.getString('Cancel'));

      sheet._riskOwnerChangeDialogOpen = true;
      $mdDialog.show(confirm).then(function() {
        $scope.applyRiskOwnerSelection(sheet, item);
        if (item) {
          $scope.resetResidualAcceptanceAfterRiskOwnerChange(sheet, {
            preserveApproverContext: shouldResetResidualDecision
          });
        } else {
          $scope.resetResidualAcceptanceAfterRiskOwnerChange(sheet);
        }
      }, function() {
        $scope.restoreRiskOwnerSelection(sheet, previousRiskOwnerSupervisor, previousRiskOwnerName);
      }).finally(function() {
        sheet._riskOwnerChangeDialogOpen = false;
      });
    };

    $scope.queryOwnerSearch = function(query, scope) {
      var promise = $q.defer();
      var currentQuery = (query || '').trim();
      var requestId = ++ownerSearchRequestId;

      AnrService.getAnrSupervisors($scope.model.anr.id, {
        filter: currentQuery,
        role: 'risk_owner',
        status: true
      }).then(function(data) {
        let supervisors = data.supervisors || [];

        if (requestId !== ownerSearchRequestId || currentQuery !== ((($scope[scope] && $scope[scope].ownerSearchText) || '').trim())) {
          promise.resolve(supervisors);
          return;
        }

        promise.resolve(supervisors);
      }, function() {
        promise.reject();
      });
      return promise.promise;
    };

    var residualApproverSearchRequestId = 0;

    $scope.onResidualApproverSelected = function(sheet, item) {
      if (!sheet) {
        return;
      }

      if (!item) {
        if (!((sheet.residualAcceptanceApproverSearchText || '').trim())) {
          sheet.residualAcceptanceApproverSupervisor = null;
          sheet.residualAcceptanceApproverSupervisorId = null;
          sheet.residualAcceptanceApproverSupervisorSelection = null;
          $scope.applyResidualAcceptanceState(sheet);
        }
        return;
      }

      sheet.residualAcceptanceApproverSupervisor = item;
      sheet.residualAcceptanceApproverSupervisorId = item.id;
      sheet.residualAcceptanceApproverSupervisorSelection = item;
      sheet.residualAcceptanceApproverSearchText = item.name || '';
      $scope.applyResidualAcceptanceState(sheet, {
        preserveDecisionFields: true
      });
    };

    $scope.queryResidualApproverSearch = function(query, scope) {
      var promise = $q.defer();
      var currentQuery = (query || '').trim();
      var requestId = ++residualApproverSearchRequestId;

      AnrService.getAnrSupervisors($scope.model.anr.id, {
        filter: currentQuery,
        role: 'residual_risk_approver',
        status: true
      }).then(function(data) {
        var supervisors = data.supervisors || [];

        if (requestId !== residualApproverSearchRequestId
          || currentQuery !== ((($scope[scope] && $scope[scope].residualAcceptanceApproverSearchText) || '').trim())
        ) {
          promise.resolve(supervisors);
          return;
        }

        promise.resolve(supervisors);
      }, function() {
        promise.reject();
      });

      return promise.promise;
    };

    $scope.applyResidualRiskDecisionResponse = function(sheet, response) {
      if (!sheet || !response) {
        return;
      }

      sheet.residualRiskDecision = response.residualRiskDecision;
      sheet.residualAcceptanceUseRiskOwner = !!response.residualAcceptanceUseRiskOwner;
      sheet.residualAcceptanceApproverSupervisor = response.residualAcceptanceApproverSupervisor || null;
      sheet.residualAcceptanceApproverSupervisorId = response.residualAcceptanceApproverSupervisorId || null;
      sheet.residualAcceptanceApproverSupervisorSelection = response.residualAcceptanceApproverSupervisor || null;
      sheet.residualAcceptanceApproverSearchText = response.residualAcceptanceApproverSupervisor
        ? (response.residualAcceptanceApproverSupervisor.name || '')
        : '';
      sheet.residualAcceptancePerformedByName = response.residualAcceptancePerformedByName || null;
      sheet.residualAcceptancePerformedByEmail = response.residualAcceptancePerformedByEmail || null;
      sheet.residualAcceptancePerformedOnBehalf = !!response.residualAcceptancePerformedOnBehalf;
      sheet.residualRiskDecidedBySupervisor = response.residualRiskDecidedBySupervisor || null;
      sheet.residualRiskDecidedBySupervisorId = response.residualRiskDecidedBySupervisorId;
      sheet.residualRiskDecidedByUserId = response.residualRiskDecidedByUserId;
      sheet.residualRiskDecidedByName = response.residualRiskDecidedByName;
      sheet.residualRiskDecidedAt = response.residualRiskDecidedAt;
      sheet.residualRiskJustification = response.residualRiskJustification;
      sheet.residualRiskDecidedAtValue = $scope.parseDateValue(response.residualRiskDecidedAt);
      $scope.applyResidualAcceptanceState(sheet, {
        preserveDecisionFields: true
      });
      $scope.captureResidualAcceptanceSnapshot(sheet);
    };

    $scope.submitResidualRiskDecision = function(sheet, decision) {
      if (!sheet || !$scope.canCurrentUserDecideResidualRisk(sheet)) {
        return;
      }

      AnrService.decideInstanceRiskResidualAcceptance($scope.model.anr.id, sheet.id, {
        decision: decision,
        justification: sheet.residualRiskJustification
      }, function(response) {
        $scope.applyResidualRiskDecisionResponse(sheet, response);
        $scope.$broadcast('risks-table-edited');
        $scope.updateAnrRisksTable();
        $scope.loadRiskHistory(sheet, false);
      });
    };

    $scope.submitOperationalResidualRiskDecision = function(sheet, decision) {
      if (!sheet || !$scope.canCurrentUserDecideResidualRisk(sheet)) {
        return;
      }

      AnrService.decideInstanceOpRiskResidualAcceptance($scope.model.anr.id, sheet.id, {
        decision: decision,
        justification: sheet.residualRiskJustification
      }, function(response) {
        $scope.applyResidualRiskDecisionResponse(sheet, response);
        $scope.$broadcast('risks-table-edited');
        $scope.updateAnrRisksOpTable();
        $scope.loadRiskHistory(sheet, true);
      });
    };

    $scope.$on('recommendations-loaded', function(ev, recs) {
      $scope._copyRecs = recs;
    });

    /**
     * Risk analysis
     */
    var editEvalContext = function(step) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
        controller: [
          '$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'GuideService', 'InterestedPartyService', 'anr', 'subStep',
          MethodEditContextDialog
        ],
        templateUrl: 'views/anr/edit.evalcontext.html',
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
        locals: {
          InterestedPartyService: InterestedPartyService,
          subStep: step,
          anr: $scope.model.anr,
        }
      }).then(function(data) {
        var req = {
          id: $scope.model.anr.id
        };
        req[step.anrField] = data.text;

        var ClientAnrService = $injector.get('ClientAnrService');
        ClientAnrService.updateAnr(req, function() {
          toastr.success(gettextCatalog.getString("Edition successful"));
          $scope.updateModel(true);
        });
      });
    };

    var editTrendsContext = function(step) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
        controller: ['$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'QuestionService', 'ThreatService', 'ClientAnrService', 'GuideService', 'anr', 'subStep', MethodEditTrendsDialog],
        templateUrl: 'views/anr/trends.evalcontext.html',
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
        locals: {
          ClientAnrService: $injector.get('ClientAnrService'),
          anr: $scope.model.anr,
          subStep: step
        }
      }).then(function() {
        $scope.updateAnrRisksTable();
        $scope.$broadcast('risks-table-edited');
      }, function() {
        $scope.updateAnrRisksTable();
        $scope.$broadcast('risks-table-edited');
      });
    };

    $scope.editRecommendationContext = function(ev, rec) {
      ev.preventDefault();
      if ($mdDialog) {
        $mdDialog.cancel();
      }
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
      $mdDialog.show({
        controller: ['$scope', '$mdDialog', 'rec', 'rwd', 'ClientRecommendationService', CreateRecommendationDialogContext],
        templateUrl: 'views/anr/create.recommendation.html',
        targetEvent: ev,
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
        locals: {
          rec: rec,
          rwd: $scope.model.anr.rwd
        }
      }).then(function() {
        ClientRecommendationService.updateRecommendation(rec, function() {
          toastr.success(gettextCatalog.getString("The recommendation has been edited successfully"));
          $scope.methodProgress[2].steps[1].action($scope.methodProgress[2].steps[1]);
        });
      }, function() {
        $scope.methodProgress[2].steps[1].action($scope.methodProgress[2].steps[1]);
      });
    }

    function CreateRecommendationDialogContext($scope, $mdDialog, rec, rwd) {
      $scope.recommendation = {
        recommendation: rec
      };
      $scope.isAnrReadOnly = !rwd
      $scope.isRecoContext = true;

      $scope.delete = function() {
        $mdDialog.hide(false);
      };

      $scope.create = function() {
        $mdDialog.hide($scope.recommendation);
      };

      $scope.cancel = function() {
        $mdDialog.cancel();
      };
    }

    var editRisksContext = function(step) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
        controller: ['$scope', '$mdDialog', '$state', 'TreatmentPlanService',
          'ClientRecommendationService', 'DownloadService', 'anr', 'subStep',
          'thresholds', 'editRecommendationContext', 'gettextCatalog',
          MethodEditRisksDialog
        ],
        templateUrl: 'views/anr/risks.evalcontext.html',
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
        locals: {
          subStep: step,
          anr: $scope.model.anr,
          thresholds: $scope.thresholds,
          editRecommendationContext: $scope.editRecommendationContext
        }
      }).then(function(data) {

      }, function(reject) {
        $scope.handleRejectionDialog(reject);
      });
    };

    if ($scope.OFFICE_MODE == 'FO') {
      $scope.$watch('display.anrSelectedTabIndex', function(newValue, oldValue) {
        switch (newValue) {
          case 0:
            if (($state.$current.name == 'main.project.anr.risk' && $stateParams.riskId) ||
              ($state.$current.name == 'main.project.anr.riskop' && $stateParams.riskopId) ||
              ($state.$current.name == 'main.project.anr.object' && $stateParams.objectId) ||
              ($state.$current.name == 'main.project.anr.instance' && $stateParams.instId) ||
              ($state.$current.name == 'main.project.anr.instance.risk' && $stateParams.instId && $stateParams.riskId) ||
              ($state.$current.name == 'main.project.anr.instance.riskop' && $stateParams.instId && $stateParams.riskopId) ||
              $state.$current.name == 'main.project.anr.risksplan') {
              if ($stateParams.instId) {
                $rootScope.anr_selected_instance_id = $stateParams.instId;
                $rootScope.anr_selected_object_id = null;
              } else if ($stateParams.objectId) {
                $rootScope.anr_selected_object_id = $stateParams.objectId;
                $rootScope.anr_selected_instance_id = null;
                $scope.opsheet_risk = null;
                $scope.sheet_risk = null;
                $scope.risks = [];
                $scope.oprisks = [];
              } else {
                $rootScope.anr_selected_object_id = null;
                $rootScope.anr_selected_instance_id = null;
                $scope.opsheet_risk = null;
                $scope.sheet_risk = null;
                $scope.risks = [];
                $scope.oprisks = [];
              }
            } else {
              $state.transitionTo('main.project.anr', {
                modelId: $stateParams.modelId
              }, {
                inherit: true,
                notify: false,
                reload: false,
                location: 'replace'
              });
              $timeout(function() {
                if (oldValue == 2 && $scope.anr_selected_instance_id == null && $scope.anr) {
                  $scope.updateAnrRisksTable();
                  $scope.updateAnrRisksOpTable();
                }
              });
            }
            break;
          case 1:
            $state.transitionTo('main.project.anr.dashboard', {
              modelId: $stateParams.modelId
            }, {
              inherit: true,
              notify: true,
              reload: false,
              location: 'replace'
            });
            $timeout(function() {
              $scope.$broadcast('Dashboard');
            });
            break;
          case 2:
            $state.transitionTo('main.project.anr.scales', {
              modelId: $stateParams.modelId
            }, {
              inherit: true,
              notify: true,
              reload: false,
              location: 'replace'
            });
            $timeout(function() {
              if ($scope.model && $scope.model.anr) {
                // Update scales, in case we made changes to risks, and our ANR isn't scaleupdatable anymore
                $scope.updateScales();
                $scope.updateOperationalRiskScales();
              }
            });
            break;
          case 3:
            $state.transitionTo('main.project.anr.knowledge', {
              modelId: $stateParams.modelId
            }, {
              inherit: true,
              notify: true,
              reload: false,
              location: 'replace'
            });
            break;
          case 4:
            $state.transitionTo('main.project.anr.ropa', {
              modelId: $stateParams.modelId
            }, {
              inherit: true,
              notify: true,
              reload: false,
              location: 'replace'
            });
            break;
          case 5:
            $state.transitionTo('main.project.anr.soa', {
              modelId: $stateParams.modelId
            }, {
              inherit: true,
              notify: true,
              reload: false,
              location: 'replace'
            });
            break;
        }
      });
      $scope.$watch('ToolsAnrService.currentTab', function(newValue, oldValue) {
        if (newValue != oldValue) {
          if ($stateParams.instId) {
            $state.transitionTo('main.project.anr.instance', {
              modelId: $stateParams.modelId,
              instId: $stateParams.instId
            }, {
              inherit: true,
              notify: true,
              reload: false,
              location: 'replace'
            });
          } else {
            $state.transitionTo('main.project.anr', {
              modelId: $stateParams.modelId
            }, {
              inherit: true,
              notify: false,
              reload: false,
              location: 'replace'
            });
          }
        }
      });
    }

    var selectScalesTab = function() {
      $scope.display.anrSelectedTabIndex = 2;
    };

    var showAnrSummary = function() {
      $state.transitionTo('main.project.anr', {
        modelId: $scope.model.anr.id
      });
      $scope.clearSelectedInstAndObj();
      $scope.display.anrSelectedTabIndex = 0;
      ToolsAnrService.currentTab = 0;
    };

    var showAnrRisks = function() {
      $state.transitionTo('main.project.anr', {
        modelId: $scope.model.anr.id
      });
      $scope.clearSelectedInstAndObj();
      $scope.display.anrSelectedTabIndex = 0;
      ToolsAnrService.currentTab = 1;
    };

    var editRiskTreatPlan = function() {
      $state.transitionTo('main.project.anr.risksplan', {
        modelId: $scope.model.anr.id
      });
      $scope.clearSelectedInstAndObj();
      $scope.display.anrSelectedTabIndex = 0;
    }

    // Progress
    var updateMethodProgress = function() {
      $scope.methodProgress = [{
          num: 1,
          color: 'green',
          label: gettext("Context Establishment"),
          deliverable: gettext("Context validation"),
          steps: [{
              label: gettext("Risks analysis context"),
              action: editEvalContext,
              anrField: 'contextAnaRisk',
              progressField: 'initAnrContext'
            },
            {
              label: gettext("Evaluation of Trends and Threat, and synthesis"),
              action: editTrendsContext,
              progressField: 'initEvalContext'
            },
            {
              label: gettext("Risks management organisation"),
              action: editEvalContext,
              anrField: 'contextGestRisk',
              progressField: 'initRiskContext'
            },
            {
              label: gettext("Definition of the risk evaluation criteria"),
              action: selectScalesTab,
              progressField: 'initDefContext'
            },
          ]
        },
        {
          num: 2,
          color: 'blue',
          label: gettext("Context modeling"),
          deliverable: gettext("Model validation"),
          steps: [{
              label: gettext("Identification of assets, vulnerabilities and impacts appreciation"),
              action: showAnrSummary,
              progressField: 'modelImpacts'
            },
            {
              label: gettext("Synthesis of assets / impacts"),
              action: editEvalContext,
              anrField: 'synthAct',
              progressField: 'modelSummary'
            },
          ]
        },
        {
          num: 3,
          color: 'yellow',
          label: gettext("Evaluation and treatment of risks"),
          deliverable: gettext("Final report"),
          steps: [{
              label: gettext("Estimation, evaluation and risk treatment"),
              action: showAnrSummary,
              progressField: 'evalRisks'
            },
            {
              label: gettext("Risk treatment plan management"),
              action: editRisksContext,
              progressField: 'evalPlanRisks'
            },
          ]
        },
        {
          num: 4,
          color: 'red',
          label: gettext("Implementation and monitoring"),
          deliverable: gettext("Implementation Plan"),
          steps: [{
            label: gettext("Management of the implementation of the risk treatment plan"),
            action: editRiskTreatPlan,
            progressField: 'manageRisks'
          }, ]
        }
      ];


      // Update done status
      for (var i = 0; i < $scope.methodProgress.length; ++i) {
        for (var j = 0; j < $scope.methodProgress[i].steps.length; ++j) {
          var obj = $scope.methodProgress[i].steps[j];
          obj.done = ($scope.model.anr[obj.progressField] == 1);
        }
      }
    };

    $scope.openMethodDeliverable = function(step, ev) {
      ev.preventDefault();

      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
        controller: ['$scope', '$mdDialog', '$http', 'anr', 'step', MethodDeliverableDialog],
        templateUrl: 'views/anr/deliverable.evalcontext.html',
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
        locals: {
          anr: $scope.model.anr,
          step: step,
        }
      }).then(function(deliverable) {
        $http.post('api/client-anr/' + $scope.model.anr.id + '/deliverable', deliverable, {
          responseType: "arraybuffer"
        }).then(function(data) {
          var docname = deliverable.docname;
          if (!docname) {
            docname = 'Untitled-Deliverable';
          }

          DownloadService.downloadBlob(data.data, docname + '.docx');
          toastr.success(gettextCatalog.getString('The deliverable has been generated successfully.'), gettextCatalog.getString('Generation successful'));
        })
      }, function(reject) {
        $scope.handleRejectionDialog(reject);
      });
    };

    $scope.setMethodStepStatus = function(field, substep, done) {
      if ($scope.isAnrReadOnly) {
        return;
      }

      var obj = {
        id: $scope.model.anr.id
      };
      obj[field] = (done ? 0 : 1);

      var ClientAnrService = $injector.get('ClientAnrService');
      ClientAnrService.updateAnr(obj, function() {
        $scope.model.anr[field] = obj[field];
        substep.done = (obj[field] == 1);
      })
    };

    $scope.getStepProgress = function(step) {
      var progress = 0;
      for (var i = 0; i < step.steps.length; ++i) {
        if ($scope.model.anr[step.steps[i].progressField] == 1) {
          ++progress;
        }
      }

      return progress;
    };

    $scope.getMethodTextColor = function(step, subStep) {
      if ($scope.model.anr[subStep.progressField] == 1) {
        return 'txt-' + step.color;
      } else {
        return '';
      }
    };

    $scope.isMethodStepComplete = function(step) {
      var complete = true;
      for (var i = 0; i < step.steps.length; ++i) {
        if (!$scope.model.anr[step.steps[i].progressField]) {
          complete = false;
          break;
        }
      }

      return complete;
    };

    // Tree
    $scope.anr_obj_instances_data = null;
    $scope.anr_obj_library_data = null;
    $scope.anr_instance_tree_is_patching = false;

    // As our controllers are static in this zone, we must go through the rootScope to update the selected instance
    // ID from the child controller (AnrObjectInstanceCtrl)
    $rootScope.anr_selected_instance_id = $stateParams.instId;
    $rootScope.anr_selected_object_id = $stateParams.objectId;

    $scope.filter = {
      instance: '',
      library: ''
    };

    $scope.wrapAll = function(root) {
      if (!root) {
        root = $scope.anr_obj_instances_data;
      }

      for (var i = 0; i < root.length; ++i) {
        var node = root[i];

        if (node.__children__ && node.__children__.length > 0) {
          $scope.wrapAll(node);
        }

        node.__collapsed__ = true;
        $scope.collapseCache['inst' + node.id] = true;
      }
    };

    $scope.unwrapAll = function(root) {
      if (!root) {
        root = $scope.anr_obj_instances_data;
      }

      for (var i = 0; i < root.length; ++i) {
        var node = root[i];

        if (node.__children__ && node.__children__.length > 0) {
          $scope.unwrapAll(node.__children__);
        }

        node.__collapsed__ = false;
        $scope.collapseCache[node.type + node.id] = false;
      }
    };

    var applyCollapsedCache = function(root) {
      if (!root) {
        root = $scope.anr_obj_instances_data;
      }

      for (var i = 0; i < root.length; ++i) {
        var node = root[i];

        if (node.__children__ && node.__children__.length > 0) {
          applyCollapsedCache(node.__children__);
        }

        node.__collapsed__ = $scope.collapseCache[node.type + node.id];
      }
    };

    $scope.unwrapAllObjects = function() {
      $scope.unwrapAll($scope.anr_obj_library_data);
    };

    $scope.$watch('filter.library', function(newValue, oldValue) {
      if ((!oldValue || oldValue.length == 0) && newValue.length > 0) {
        $scope.__collapseCacheCopy = angular.copy($scope.collapseCache);
        $scope.unwrapAllObjects();
      } else if (oldValue && oldValue.length > 0 && newValue.length == 0) {
        $scope.collapseCache = $scope.__collapseCacheCopy;
        applyCollapsedCache($scope.anr_obj_library_data);
      }
    });

    $scope.$watch('filter.instance', function(newValue, oldValue) {
      if ((!oldValue || oldValue.length == 0) && newValue.length > 0) {
        $scope.__collapseCacheCopy = angular.copy($scope.collapseCache);
        $scope.unwrapAll();
      } else if (oldValue && oldValue.length > 0 && newValue.length == 0) {
        $scope.collapseCache = $scope.__collapseCacheCopy;
        applyCollapsedCache($scope.anr_obj_instances_data);
      }
    });

    $scope.toggleItemCollapsed = function(node) {
      if (!$scope.collapseCache) {
        $scope.collapseCache = {};
      }

      if ($scope.collapseCache[node.type + node.id] !== undefined) {
        $scope.collapseCache[node.type + node.id] = !$scope.collapseCache[node.type + node.id];
      } else {
        $scope.collapseCache[node.type + node.id] = false;
      }

      node.__collapsed__ = $scope.collapseCache[node.type + node.id];
    };

    $scope.removeAccents = function(str) {
      return str.toLowerCase()
        .replace(/[áàãâä]/gi, "a")
        .replace(/[éè¨ê]/gi, "e")
        .replace(/[íìïî]/gi, "i")
        .replace(/[óòöôõ]/gi, "o")
        .replace(/[úùüû]/gi, "u")
        .replace(/[ç]/gi, "c")
        .replace(/[ñ]/gi, "n")
        .replace(/[^a-zA-Z0-9]/g, " ");
    }

    $scope.visible = function(item) {
      var label = (item.type == 'lib' || item.type == 'inst') ? $scope._langField(item, 'name') : $scope._langField(item, 'label');
      var filterText = (item.type == 'lib' || item.type == 'libcat') ? $scope.filter.library : $scope.filter.instance;
      if (filterText && filterText.length > 0) {
        if (item.__children__.length > 0) {
          for (var i = 0; i < item.__children__.length; ++i) {
            if ($scope.visible(item.__children__[i])) {
              return true;
              break;
            }
          }
          if ($scope.removeAccents(label).indexOf($scope.removeAccents(filterText)) >= 0) {
            return true;
          }

          return false;
        } else {
          return $scope.removeAccents(label).indexOf($scope.removeAccents(filterText)) >= 0;
        }
      }
      return true;
    };

    $scope.insTreeCallbacks = {
      beforeDrag: function(scopeDrag) {
        return !$scope.isAnrReadOnly && !scopeDrag.$modelValue.component && !$scope.anr_instance_tree_is_patching;
      },

      beforeDrop: function(e) {
        let nodeSourceId = e.source.nodeScope.$modelValue.id;
        let nodeDestId = e.dest.nodesScope.node ? e.dest.nodesScope.node.id : undefined;
        if (nodeSourceId == nodeDestId) {
          return false;
        }
      },

      accept: function(sourceNodeScope, destNodeScope, destIndex) {
        return (sourceNodeScope.$modelValue.type != 'libcat');
      },

      dropped: function(e) {
        if (e.source.nodesScope.$treeScope.$id == e.dest.nodesScope.$treeScope.$id) {
          var obj = e.source.nodeScope.$modelValue;
          $scope.anr_instance_tree_is_patching = true;
          AnrService.moveInstance($scope.model.anr.id, obj.id, e.dest.nodesScope.$parent.$modelValue ? e.dest.nodesScope.$parent.$modelValue.id : 0, e.dest.index, function() {
            $scope.updateInstances(function() {
              $scope.anr_instance_tree_is_patching = false;
            });
            $scope.$broadcast('instance-moved', obj.id);
          });

          return true;
        } else {
          return false;
        }
      }
    };

    $scope.libTreeCallbacks = {
      beforeDrag: function (scopeDrag) {
        return !$scope.isAnrReadOnly
          && scopeDrag.$modelValue.type !== 'libcat'
          && scopeDrag.$modelValue.uuid != null
          && !$scope.anr_instance_tree_is_patching;
      },

      accept: function (sourceNodeScope, destNodeScope, destIndex) {
        return sourceNodeScope.$treeScope.$id === destNodeScope.$treeScope.$id
          && sourceNodeScope.$modelValue.depth === 0
          && destNodeScope.$parent.$type === 'uiTree';
      },

      dropped: function (e) {
        if (e.source.nodesScope.$treeScope.$id !== e.dest.nodesScope.$treeScope.$id) {
          // Make a copy of the item from the library tree to the inst tree
          var copy = angular.copy(e.source.nodeScope.$modelValue);
          e.source.nodeScope.$modelValue.type = 'inst';
          e.source.nodeScope.$modelValue.disableclick = true;

          e.source.nodesScope.$modelValue.push(copy);
          // Also, tell the server to instantiate the object
          $scope.anr_instance_tree_is_patching = true;
          AnrService.addInstance($scope.model.anr.id, copy.uuid, e.dest.nodesScope.$parent.$modelValue ? e.dest.nodesScope.$parent.$modelValue.id : 0, e.dest.index, function () {
            $scope.updateAnrRisksTable();
            $scope.updateAnrRisksOpTable();
            $scope.updateInstances(function () {
              $scope.anr_instance_tree_is_patching = false;
              e.source.nodeScope.$modelValue.disableclick = false;
            });

            $scope.$broadcast('object-instancied', {oid: copy.uuid});
          });
        }

        return true;
      }
    };

    $scope.updateObjectsLibrary = function(gotofirst, callback) {
      AnrService.getObjectsLibrary($scope.model.anr.id).then(function(data) {
        if (!$scope.collapseCache) {
          $scope.collapseCache = {};
        }

        var recurseFillTree = function(category, depth) {
          var output = {
            id: category.id,
            type: 'libcat',
            label1: category.label1,
            label2: category.label2,
            label3: category.label3,
            label4: category.label4,
            depth: depth,
            __children__: []
          };

          if ($scope.collapseCache[output.type + output.id] !== undefined) {
            output.__collapsed__ = $scope.collapseCache[output.type + output.id];
          } else {
            output.__collapsed__ = true;
            $scope.collapseCache[output.type + output.id] = true;
          }

          if (category.child && category.child.length > 0) {
            for (var i = 0; i < category.child.length; ++i) {
              output.__children__.push(recurseFillTree(category.child[i], depth + 1));
            }
          }
          var tempChildren = []; //temporary table to sort the "leaf object"
          if (category.objects && category.objects.length > 0) {
            for (var i = 0; i < category.objects.length; ++i) {
              var obj = category.objects[i];
              obj.type = 'lib';

              if ($scope.collapseCache[obj.type + obj.uuid] !== undefined) {
                obj.__collapsed__ = $scope.collapseCache[obj.type + obj.uuid];
              } else {
                obj.__collapsed__ = true;
                $scope.collapseCache[obj.type + obj.uuid] = true;
              }

              obj.__children__ = [];
              tempChildren.push(obj); //making the leaf object
              if ($scope.first_object == null) {
                $scope.first_object = obj;
              }
            }
            tempChildren.sort(function(a, b) { //sort the leaf object
              return ($scope._langField(a, 'name')).localeCompare($scope._langField(b, 'name'), {
                ignorePunctuation: true
              });
            });

            tempChildren.forEach(function(element) { //add the leaf objects to all the children
              output.__children__.push(element);
            });
          }

          return output;
        };

        var lib_data = [];
        $scope.first_object = null;
        $scope.has_virtual_categ = false;
        for (var v = 0; v < data.categories.length; ++v) {
          if (data.categories[v].child || data.categories[v].objects.length > 0) { //do not show empty category
            var cat = data.categories[v];
            if (cat.id == -1) {
              $scope.has_virtual_categ = true;
            }
            lib_data.push(recurseFillTree(cat, 0));
          }
        }
        $scope.anr_obj_library_data = lib_data;

        if (gotofirst != undefined && gotofirst) {
          if ($scope.first_object != null) {
            if ($scope.OFFICE_MODE == 'BO') {
              $location.path('/backoffice/kb/models/' + $stateParams.modelId + '/object/' + $scope.first_object.uuid);
            } else {
              $location.path('/client/project/' + $stateParams.modelId + '/anr/object/' + $scope.first_object.uuid);
            }
          } else {
            if ($scope.OFFICE_MODE == 'BO') {
              $location.path('/backoffice/kb/models/' + $stateParams.modelId);
            } else {
              $location.path('/client/project/' + $stateParams.modelId + '/anr');
            }
          }
        }

        if (callback != undefined) {
          callback.call();
        }
      });
    };

    $scope.updateInstances = function(cb) {
      AnrService.getInstances($scope.model.anr.id).then(function(data) {
        $scope.anr_obj_instances_data = [];
        $scope.instanceCache = {};
        if (!$scope.collapseCache) {
          $scope.collapseCache = {};
        }

        var recurseFillTree = function(instance, parentPath) {
          var output = {
            id: instance.id,
            type: 'inst',
            scope: instance.scope,
            name1: instance.name1,
            name2: instance.name2,
            name3: instance.name3,
            name4: instance.name4,
            component: instance.level > 1,
            __children__: []
          };
          if ($scope.collapseCache[output.type + output.id] !== undefined) {
            output.__collapsed__ = $scope.collapseCache[output.type + output.id];
          } else {
            output.__collapsed__ = true;
            $scope.collapseCache[output.type + output.id] = true;
          }

          var parentPathPlusOne = parentPath ? (parentPath + " > " + $scope._langField(instance, 'name')) : $scope._langField(instance, 'name');

          if (instance.child && instance.child.length > 0) {
            for (var i = 0; i < instance.child.length; ++i) {
              output.__children__.push(recurseFillTree(instance.child[i], parentPathPlusOne));
            }
          }

          instance.completePath = parentPathPlusOne;

          $scope.instanceCache[instance.id] = instance;

          return output;
        };

        for (var v = 0; v < data.instances.length; ++v) {
          var instance = data.instances[v];
          $scope.anr_obj_instances_data.push(recurseFillTree(instance));
        }

        if (cb) {
          cb();
        }
      });

    };

    $scope.openAnrToolsMenu = function($mdOpenMenu, ev) {
      $mdOpenMenu(ev);
    }

    $scope.inlineNumberValidator = function(val) {
      return (parseInt(val) == val);
    };

    var updateInfoRiskColumns = function() {
      var header = [];
      for (var t = $scope.scales.threats.min; t <= $scope.scales.threats.max; ++t) {
        for (var v = $scope.scales.vulns.min; v <= $scope.scales.vulns.max; ++v) {
          var prod = t * v;
          if (header.indexOf(prod) < 0) {
            header.push(prod);
          }
        }
      }

      $scope.info_risk_columns = header.sort(function(a, b) {
        return parseInt(a) - parseInt(b);
      });
    };

    $scope.scales = {
      impacts: {
        min: 0,
        max: 3
      },
      threats: {
        min: 0,
        max: 4
      },
      vulns: {
        min: 0,
        max: 3
      },
    };

    $scope.opRiskScales = {
      impacts: {
        min: 0,
        max: 5
      },
      threats: {
        min: 0,
        max: 5
      }
    }

    $scope.comms = {
      impact: [],
      threat: [],
      vuln: []
    }

    $scope.info_risk_columns = [];

    var scaleWatchSetup = false;
    var thresholdsWatchSetup = false;
    var commsWatchSetup = false;

    $scope.$watch('thresholds', function() {
      if ($scope.thresholds && ($scope.thresholds.thresholds.min < 0 || $scope.thresholds.rolf_thresholds.min < 0 ||
          $scope.thresholds.thresholds.max < $scope.thresholds.thresholds.min || $scope.thresholds.rolf_thresholds.max < $scope.thresholds.rolf_thresholds.min)) {
        return;
      }

      if ($scope.model && $scope.model.anr && thresholdsWatchSetup) {
        // This structure holds (ROLF) thresholds, as well as scales ranges
        var service = AnrService;
        if ($scope.OFFICE_MODE == 'FO') {
          service = $injector.get('ClientAnrService');
        }

        service.patchAnr($scope.model.anr.id, {
          seuil1: $scope.thresholds.thresholds.min,
          seuil2: $scope.thresholds.thresholds.max,
          seuilRolf1: $scope.thresholds.rolf_thresholds.min,
          seuilRolf2: $scope.thresholds.rolf_thresholds.max,
        });
      }

      updateInfoRiskColumns();
      thresholdsWatchSetup = true;
    }, true);

    var updateScale = function(id, model) {
      model.min = parseInt(model.min);
      model.max = parseInt(model.max);
      if (isNaN(model.min) || model.min < 0) model.min = 0;
      if (isNaN(model.max) || model.max < 0) model.max = 0;

      if (model.min > model.max) model.min = model.max;
      if (model.max < model.min) model.max = model.min;

      var promise = $q.defer();

      if (!$scope.scalesCanChange && $scope.OFFICE_MODE == 'FO') {
        toastr.warning(gettextCatalog.getString("You may not change scales anymore"));
        return false;
      }

      AnrService.updateScale($scope.model.anr.id, id, model.min, model.max, function() {
        $scope.$broadcast('scale-changed');

        updateInfoRiskColumns();

        // Reload comments
        $scope.updateScales();
        $scope.updateScaleComments(id);

        // Reload risk sheet in case ranges impact it
        if ($scope.sheet_risk) {
          $scope.updateAnrRisksTable(function() {
            $scope.openRiskSheet($scope.sheet_risk);
          });
        }

        $q.resolve();
      }, function() {
        $q.reject();
      });

      return promise;
    };

    $scope.onImpactScaleChanged = function(model, value) {
      return updateScale($scope.scales.impacts.id, model);
    };

    $scope.onThreatScaleChanged = function(model, value) {
      return updateScale($scope.scales.threats.id, model);
    };

    $scope.onVulnScaleChanged = function(model, value) {
      return updateScale($scope.scales.vulns.id, model);
    };

    var updateComm = function(model_id, row_id, model) {
      var promise = $q.defer();

      AnrService.updateScaleComment($scope.model.anr.id, model_id, row_id, model, function() {
        $scope.updateScaleComments(model_id);
        promise.resolve();
      }, function() {
        promise.reject();
      });

      return promise;
    };

    var createComm = function(model_id, row_id, comment, impactType) {
      var promise = $q.defer();
      let comm = {
        ['comment' + $scope.scales.language]: comment
      };

      AnrService.createScaleComment($scope.model.anr.id, model_id, row_id, comm, impactType, function() {
        $scope.updateScaleComments(model_id);
        promise.resolve();
      }, function() {
        promise.reject();
      });

      return promise;
    };

    var patchComm = function(id, newValue) {
      var promise = $q.defer();
      AnrService.patchScaleType($scope.model.anr.id, id, {
        ['label' + $scope.scales.language]: newValue
      }, function() {
        promise.resolve();
      }, function() {
        promise.reject();
      });

      return promise;
    };

    $scope.onImpactCommChanged = function(model, value) {

      if (value == 'label' + $scope.scales.language) {
        return patchComm(model.id, model[value]);
      }
      if (!model.id) {
        return createComm($scope.scales.impacts.id, model.scaleValue, model[value], model.scaleImpactType);
      } else {
        return updateComm($scope.scales.impacts.id, model.id, model);
      }
    };

    $scope.onThreatCommChanged = function(model, value) {
      if (!model.id) {
        return createComm($scope.scales.threats.id, model.scaleValue, model[value]);
      } else {
        return updateComm($scope.scales.threats.id, model.id, model);
      }
    };

    $scope.onVulnCommChanged = function(model, value) {
      if (!model.id) {
        return createComm($scope.scales.vulns.id, model.scaleValue, model[value]);
      } else {
        return updateComm($scope.scales.vulns.id, model.id, model);
      }
    };

    $scope.addInformationRiskScales = function(ev) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
        controller: ['$scope', '$mdDialog', 'language', AddScaleDialogCtrl],
        templateUrl: 'views/anr/create.scale.html',
        targetEvent: ev,
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
        locals: {
          language: $scope.scales.language
        }
      }).then(function(scale) {
        let cont = scale.cont;
        scale.cont = undefined;
        let labels = {};

        for (label in scale.label) {
          let language = Object.values($scope.languages).filter(language => language.code == label)[0].index;
          labels['label' + language] = scale.label[label];
        }

        if (cont) {
          $scope.addInformationRiskScales(ev);
        }

        AnrService.createScaleType(
          $scope.model.anr.id,
          $scope.scales.impacts.id,
          labels,
          function() {
            $scope.updateScaleTypes(function() {
              $timeout(
                function() {
                  var scroller = document.getElementById('horiz-scrollable');
                  scroller.scrollLeft = scroller.scrollWidth;
                }, 0, false);
            });
            $scope.$broadcast('scales-impacts-type-changed');
          },
          function() {
            $scope.addInformationRiskScales(ev);
          });
      }, function(reject) {
        $scope.handleRejectionDialog(reject);
      });
    };

    $scope.onEditCustomColumn = function(id, newValue) {
      AnrService.patchScaleType($scope.model.anr.id, id, {
        ['label' + $scope.scales.language]: newValue
      }, function() {});
    };

    $scope.setImpactVisibility = function(id, visible) {
      AnrService.patchScaleType($scope.model.anr.id, id, {
        isHidden: visible ? 0 : 1
      }, function() {
        $scope.updateScaleTypes();
        $scope.$broadcast('scales-impacts-type-changed');
      });
    };

    $scope.deleteInformationRiskScales = function(ev) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
        controller: ['$scope', '$mdDialog', 'gettextCatalog', 'scales', 'forceValidator', 'language', DeleteScaleDialogCtrl],
        templateUrl: 'views/anr/delete.scale.html',
        targetEvent: ev,
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
        locals: {
          scales: $scope.scales_types.filter(scale => scale.type == 'CUS'),
          forceValidator: true,
          language: $scope.scales.language,
        }
      }).then(function(ids) {

        ids.forEach((id, index) => {
          AnrService.deleteScaleType($scope.model.anr.id, id, function() {
            if (index == ids.length - 1) {
              toastr.success(gettextCatalog.getString('{{count}} scales have been deleted.', {
                count: ids.length
              }), gettextCatalog.getString('Deletion successful'));
              $scope.updateScaleTypes();
              $scope.$broadcast('scales-impacts-type-changed');
            }
          });
        });
      }, function(reject) {
        $scope.handleRejectionDialog(reject);
      });
    };

    $scope.deleteAnr = function(ev) {
      $scope.deleteClientAnrGlobal(ev, $scope.model.anr, function() {
        $state.transitionTo('main.project');
      });
    };

    $scope.editAnrInfo = function(ev) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
          controller: ['$scope', '$mdDialog', '$http', '$q', 'ConfigService', 'ModelService',
            'ClientAnrService', 'ReferentialService', 'anr', CreateRiskAnalysisDialog
          ],
          templateUrl: 'views/dialogs/create.anr.html',
          targetEvent: ev,
          preserveScope: false,
          scope: $scope.$dialogScope.$new(),
          clickOutsideToClose: false,
          fullscreen: useFullScreen,
          locals: {
            anr: angular.copy($scope.model.anr)
          }
        })
        .then(function(anr) {
          var service = AnrService;
          if ($scope.OFFICE_MODE == 'FO') {
            service = $injector.get('ClientAnrService');
          }
          $scope.updatingANR = true;
          service.patchAnr($scope.model.anr.id, anr, function() {
            toastr.success(gettextCatalog.getString("The risk analysis have been edited."), gettextCatalog.getString("Edition successful"));
            $rootScope.$broadcast('referentialsUpdated');
            $rootScope.$broadcast('anrUpdated');
            $scope.updatingANR = false;
          });
          $scope.model.anr = anr;
        }, function(reject) {
          $scope.handleRejectionDialog(reject);
        });
    };

    $scope.addObject = function(ev) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      if ($scope.OFFICE_MODE == 'BO') {
        $mdDialog.show({
            controller: ['$scope', '$mdDialog', '$q', '$state', 'gettextCatalog', 'ObjlibService', 'AnrService', '$stateParams', '$location', '$parentScope', 'anr_id', 'categories', AddObjectDialogCtrl],
            templateUrl: 'views/anr/add.objlib.html',
            targetEvent: ev,
            preserveScope: false,
            scope: $scope.$dialogScope.$new(),
            clickOutsideToClose: false,
            fullscreen: useFullScreen,
            locals: {
              '$parentScope': $scope,
              anr_id: $scope.model.anr.id,
              categories: $scope.categories
            }
          })
          .then(function(objlib) {
            if (objlib.object && objlib.object.uuid && objlib.type == 'object') {
              AnrService.addExistingObjectToLibrary($scope.model.anr.id, objlib.object.uuid, function() {
                $scope.updateObjectsLibrary(false, function() {
                  $location.path('/backoffice/kb/models/' + $scope.model.id + '/object/' + objlib.object.uuid);
                });
                toastr.success(gettextCatalog.getString("The asset has been added to the library."), gettextCatalog.getString("Asset added successfully"));
              });
            } else if (objlib.category && objlib.category.id && objlib.type == 'category') {
              AnrService.addExistingWholeCategoryToLibrary($scope.model.anr.id, objlib.category.id, function() {
                $scope.updateObjectsLibrary(false, function() {});
                toastr.success(gettextCatalog.getString("The category has been added to the library."), gettextCatalog.getString("Category added successfully"));
              });
            }
          }, function(reject) {
            $scope.handleRejectionDialog(reject);
          });
      } else {
        $scope.createAttachedObject = createAttachedObject;
        createAttachedObject($scope, $mdDialog, $state, $location, $scope, AnrService, ev)
      }
    };

    // C'est pas beau mais pas le choix, on doit pré-initialiser les objets pour le binding des editable
    for (var j = 0; j < 100; ++j) {
      $scope.comms.threat[j] = {
        id: null,
        comment1: null,
        comment2: null,
        comment3: null,
        comment4: null,
        scaleValue: j
      };

      $scope.comms.vuln[j] = {
        id: null,
        comment1: null,
        comment2: null,
        comment3: null,
        comment4: null,
        scaleValue: j
      };
    }

    $scope.switchOpRisksLanguage = function() {
      $scope.opRisksLanguageSelected = $scope.languages[$scope.opRisksScales.language].code;
      $scope.updateOperationalRiskScales();
    };

    $scope.onOpRiskImpactScaleChanged = function(model, value) {
      let promise = $q.defer();
      AnrService.updateValueForAllOperationalRiskScale(
        $scope.model.anr.id, {
          numberOfLevelForOperationalImpact: model[value]
        },
        function() {
          promise.resolve();
          $scope.updateOperationalRiskScales();
        },
        function() {
          promise.reject();
        }
      );

      return promise;
    };

    $scope.onOpRiskScaleCommChanged = function(model, value) {
      let promise = $q.defer();
      if (value == 'scaleValue') {
        AnrService.updateValueForAllOperationalRiskScale(
          $scope.model.anr.id, {
            scaleValue: model.scaleValue,
            scaleIndex: model.scaleIndex
          },
          function() {
            promise.resolve();
            $scope.updateOperationalRiskScales();
          }
        );
      }
      if (value == 'label') {
        AnrService.updateOperationalRiskScale(
          $scope.model.anr.id,
          model.id, {
            language: $scope.opRisksLanguageSelected,
            [value]: model[value]
          },
          function() {
            promise.resolve();
            $scope.updateOperationalRiskScales();
          },
          function() {
            promise.reject();
          }
        )
      }
      if (value == 'comment') {
        AnrService.updateOperationalRiskScaleComment(
          $scope.model.anr.id,
          model.scaleId,
          model.id, {
            language: $scope.opRisksLanguageSelected,
            [value]: model[value]
          },
          function() {
            promise.resolve();
            $scope.updateOperationalRiskScales();
          },
          function() {
            promise.reject();
          }
        );
      }

      return promise;
    };

    $scope.onEditOpRiskScale = function(id, field, value) {
      let promise = $q.defer();
      AnrService.updateOperationalRiskScale(
        $scope.model.anr.id,
        id, {
          language: $scope.opRisksLanguageSelected,
          [field]: value
        },
        function() {
          promise.resolve();
          $scope.updateOperationalRiskScales();
        },
        function() {
          promise.reject();
        }
      )

      return promise;
    };

    $scope.onOpRiskLikelihoodScaleChanged = function(model, value) {
      let promise = $q.defer();
      let params = {
        probabilityMin: model[value],
        probabilityMax: model.max
      };
      if (value == 'max') {
        params = {
          probabilityMin: model.min,
          probabilityMax: model[value]
        };
      }
      AnrService.updateValueForAllOperationalRiskScale(
        $scope.model.anr.id,
        params,
        function() {
          promise.resolve();
          $scope.updateOperationalRiskScales();
        },
        function() {
          promise.reject();
        }
      );

      return promise;
    };

    $scope.updateOperationalRiskScales = function(cb) {
      AnrService.getOperationalRiskScales($scope.model.anr.id, $scope.opRisksLanguageSelected).then(function(data) {
        let allScales = data.data;
        $scope.opRiskImpactScaleValues = [];
        $scope.opRiskImpactScalesTooltips = {};

        $scope.opRiskLikelihoodScale = allScales.filter(scale => scale.type == 2)[0];
        $scope.opRiskScales.threats.min = $scope.opRiskLikelihoodScale.min;
        $scope.opRiskScales.threats.max = $scope.opRiskLikelihoodScale.max;

        $scope.opRiskImpactTypeScale = allScales.filter(scale => scale.type == 1)[0];

        $scope.opRiskImpactScales = $scope.opRiskImpactTypeScale.scaleTypes;
        $scope.opRiskScales.impacts.min = $scope.opRiskImpactTypeScale.min;
        $scope.opRiskScales.impacts.max = $scope.opRiskImpactTypeScale.max + 1;
        $scope.opRiskScalesAreHidden = $scope.opRiskImpactScales.filter(scale => scale.isHidden == true).length > 0 ? true : false;


        allScales.forEach(function(scale) {
          scale.scaleTypes.forEach(function(scaleType) {
            $scope.opRiskImpactScalesTooltips[scaleType.id] = scaleType.label + '\n';
            scaleType.comments.forEach(function(comment) {
              $scope.opRiskImpactScalesTooltips[scaleType.id] += comment.scaleValue + ' : ' + comment.comment + '\n';
            })
          })
          if (scale.comments.length > 0) {
            $scope.opRiskImpactScalesTooltips['likelihood'] = '';
            scale.comments.forEach(function(comment) {
              $scope.opRiskImpactScalesTooltips['likelihood'] += comment.scaleValue + ' : ' + comment.comment + '\n';
            })
          }
        });

        $scope.defaultCommentsData = $scope.opRiskImpactScales[0].comments.map(function(scale) {
          $scope.opRiskImpactScaleValues.push(scale.scaleValue);
          return {
            scaleIndex: scale.scaleIndex,
            scaleValue: scale.scaleValue
          }
        });

        if (cb) {
          cb();
        }
      });
    };

    $scope.addOperationalRiskScales = function(ev) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
        controller: ['$scope', '$mdDialog', 'language', AddScaleDialogCtrl],
        templateUrl: 'views/anr/create.scale.html',
        targetEvent: ev,
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
        locals: {
          language: $scope.opRisksScales.language
        }
      }).then(function(scale) {
        let cont = scale.cont;
        scale.cont = undefined;

        if (cont) {
          $scope.addOperationalRiskScales(ev);
        }

        AnrService.createOperationalRiskScale(
          $scope.model.anr.id,
          $scope.opRiskImpactTypeScale.id,
          scale.label,
          $scope.opRiskImpactScales.min,
          $scope.opRiskImpactScales.max - 1,
          $scope.defaultCommentsData,
          function() {
            toastr.success(
              gettextCatalog.getString('The operational risk impact scale has been created successfully.'),
              gettextCatalog.getString('Creation successful')
            );
            $scope.updateOperationalRiskScales(
              function() {
                $timeout(
                  function() {
                    var scroller = document.getElementById('op-risks-horiz-scrollable');
                    scroller.scrollLeft = scroller.scrollWidth;
                  }, 0, false
                );
              }
            );
          },
          function() {
            $scope.addOperationalRiskScales(ev);
          });
      }, function(reject) {
        $scope.handleRejectionDialog(reject);
      });
    };

    $scope.deleteOperationalRiskScales = function(ev) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
        controller: ['$scope', '$mdDialog', 'gettextCatalog', 'scales', DeleteScaleDialogCtrl],
        templateUrl: 'views/anr/delete.scale.html',
        targetEvent: ev,
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
        locals: {
          scales: $scope.opRiskImpactScales,
        }
      }).then(function(ids) {
        AnrService.deleteOperationalRiskScales(ids, $scope.model.anr.id, function() {
          toastr.success(gettextCatalog.getString('{{count}} scales have been deleted.', {
            count: ids.length
          }), gettextCatalog.getString('Deletion successful'));
          $scope.updateOperationalRiskScales();
        });

      }, function(reject) {
        $scope.handleRejectionDialog(reject);
      });
    };

    $scope.soaScaleIsUpdated = true;

    $scope.switchSoaScaleLanguage = function() {
      $scope.updateSoaScale();
    };

    $scope.updateSoaScale = function() {
      $scope.soaScaleIsUpdated = false;
      SoaScaleCommentService.getSoaScaleComments({
        anrId: $rootScope.anr_id,
        language: $scope.getLanguageCode($scope.soaScale.language)
      }).then(function(data) {
        $scope.soaScale.comments = data.data;
        $scope.soaScaleIsUpdated = true;
      });
    }

    $scope.onComplianceScaleChanged = function(model, value) {
      let promise = $q.defer();
      if (value == 'max') {
        SoaScaleCommentService.patchSoaScaleComment(
          $rootScope.anr_id, {
            numberOfLevels: model[value]
          },
          function() {
            promise.resolve();
            $scope.updateSoaScale();
          }
        );
      } else {
        let language = $scope.getLanguageCode($scope.soaScale.language);
        SoaScaleCommentService.updateSoaScaleComment(
          model.id, {
            anrId: $rootScope.anr_id,
            language: language,
            [value]: model[value]
          },
          function() {
            promise.resolve();
            $scope.updateSoaScale();
          }
        );
      }
      $rootScope.$broadcast('soaScaleUpdated')
      return promise;
    };

    $scope.updateScales = function() {
      AnrService.getScales($scope.model.anr.id).then(function(data) {
        $scope.scalesCanChange = data.canChange && $scope.model.anr.cacheModelAreScalesUpdatable;
        $scope.scaleThreat = ''; // Reset tooltip Prob. on table risks
        $scope.scaleVul = ''; // Reset tooltip Qualif. on table risks
        for (var i = 0; i < data.scales.length; ++i) {
          var scale = data.scales[i];

          // We initialize empty objects for comments, then we call getScaleComments. Because Zend.
          // When we post a comment, we need to check if the ID is empty or not, and call POST/PUT methods
          // accordingly on the scales/:id/comments endpoint. For UI/UX reasons, we need to filter everything
          // here since we don't have proper backend endpoints.

          scaleWatchSetup = false;
          commsWatchSetup = false;
          if (scale.type == "impact") {
            $scope.scales.impacts.min = scale.min;
            $scope.scales.impacts.max = scale.max;
            $scope.scales.impacts.type = scale.type;
            $scope.scales.impacts.id = scale.id;
          } else if (scale.type == "threat") {
            $scope.scales.threats.min = scale.min;
            $scope.scales.threats.max = scale.max;
            $scope.scales.threats.type = scale.type;
            $scope.scales.threats.id = scale.id;
          } else if (scale.type == "vulnerability") {
            $scope.scales.vulns.min = scale.min;
            $scope.scales.vulns.max = scale.max;
            $scope.scales.vulns.type = scale.type;
            $scope.scales.vulns.id = scale.id;
          }
        }

        $scope.updateScaleTypes();
        updateInfoRiskColumns();
      });

    };

    $scope.updateScaleTypes = function(cb) {
      AnrService.getScalesTypes($scope.model.anr.id).then(function(data) {
        $scope.scales_types = data.types;

        $scope.scales_types_by_id = {};
        for (var i = 0; i < data.types.length; ++i) {
          $scope.scales_types_by_id[data.types[i].id] = data.types[i];
        }

        // Same as above, setup placeholder comments structures
        for (var i = $scope.scales.impacts.min; i <= $scope.scales.impacts.max; ++i) {
          if (!$scope.comms.impact[i]) {
            $scope.comms.impact[i] = {};
          }

          for (var j = 0; j < $scope.scales_types.length; ++j) {
            if (!$scope.comms.impact[i][$scope.scales_types[j].id]) {
              $scope.comms.impact[i][$scope.scales_types[j].id] = {
                id: null,
                comment1: null,
                comment2: null,
                comment3: null,
                comment4: null,
                scaleImpactType: $scope.scales_types[j].id,
                scaleValue: i,
                scaleIndex: i,
              };
            }
          }
        }

        // Then we finally load the actual comments for each section
        $scope.updateScaleComments($scope.scales.impacts.id);
        $scope.updateScaleComments($scope.scales.threats.id);
        $scope.updateScaleComments($scope.scales.vulns.id);

        if (cb) {
          cb();
        }
      });
    };

    $scope.onRisksTableEdited = function(model, name) {
      var promise = $q.defer();

      // This risk changed, update it
      AnrService.updateInstanceRisk($scope.model.anr.id, model.id, model, function(data) {
        promise.resolve(true);

        model.max_risk = model.cacheMaxRisk = data.cacheMaxRisk;
        model.target_risk = model.cacheTargetedRisk = data.cacheTargetedRisk;
        model.c_risk = data.riskConfidentiality;
        model.i_risk = data.riskIntegrity;
        model.d_risk = data.riskAvailability;
      }, function() {
        promise.reject(false);
      });

      return promise.promise;
    };

    $scope.changeRiskOp = function(model, value, rootModel) {
      var result = $q.defer();
      if (model.instanceRiskScaleId) {
        AnrService.patchInstanceOpRisk(
          $scope.model.anr.id,
          rootModel.id, {
            instanceRiskScaleId: model.instanceRiskScaleId,
            [value]: model[value]
          },
          function(risk) {
            rootModel.cacheBrutRisk = risk.cacheBrutRisk;
            rootModel.cacheNetRisk = risk.cacheNetRisk;
            rootModel.cacheTargetedRisk = risk.cacheTargetedRisk;
            result.resolve(true);
          },
          function() {
            result.reject(false);
          }
        );
      } else {
        AnrService.updateInstanceOpRisk($scope.model.anr.id, model.id, model, function(risk) {
          model.cacheBrutRisk = risk.cacheBrutRisk;
          model.cacheNetRisk = risk.cacheNetRisk;
          model.cacheTargetedRisk = risk.cacheTargetedRisk;
          result.resolve(true);
        }, function() {
          result.reject(false);
        });
      }
      return result.promise;
    };

    $scope.scaleCommCache = {}; // C/I/D, type
    $scope.threatCommCache = {};
    $scope.vulnsCommCache = {};
    $scope.scaleThreat = '';
    $scope.scaleVul = '';

    $scope.updateScaleComments = function(scale_id) {
      commsWatchSetup = false;
      AnrService.getScaleComments($scope.model.anr.id, scale_id).then(function(data) {
        var obj;
        var isImpact = false;

        if (scale_id === $scope.scales.threats.id) {
          obj = $scope.comms.threat;
        } else if (scale_id === $scope.scales.vulns.id) {
          obj = $scope.comms.vuln;
        } else if (scale_id === $scope.scales.impacts.id) {
          obj = $scope.comms.impact;
          isImpact = true;
        }

        // Reset comments for this scale
        if (!isImpact) {
          for (var i = 0; i < obj.length; ++i) {
            obj[i].id = null;
            obj[i].comment1 = null;
            obj[i].comment2 = null;
            obj[i].comment3 = null;
            obj[i].comment4 = null;
          }
        }

        for (var i = 0; i < data.comments.length; ++i) {
          var comm = data.comments[i];

          if (isImpact && obj[comm.scaleValue]) {
            obj[comm.scaleValue][comm.scaleImpactType.id].id = comm.id;
            obj[comm.scaleValue][comm.scaleImpactType.id].comment1 = comm.comment1;
            obj[comm.scaleValue][comm.scaleImpactType.id].comment2 = comm.comment2;
            obj[comm.scaleValue][comm.scaleImpactType.id].comment3 = comm.comment3;
            obj[comm.scaleValue][comm.scaleImpactType.id].comment4 = comm.comment4;
            obj[comm.scaleValue][comm.scaleImpactType.id].scaleValue = comm.scaleValue;
            obj[comm.scaleValue][comm.scaleImpactType.id].scaleIndex = comm.scaleIndex;


            if (!$scope.scaleCommCache[comm.scaleImpactType.type]) {
              $scope.scaleCommCache[comm.scaleImpactType.type] = {};
            }

            $scope.scaleCommCache[comm.scaleImpactType.type][comm.scaleValue] = $scope._langField(comm, 'comment');
          } else if (!isImpact) {
            if (!obj[comm.scaleValue]) {
              obj[comm.scaleValue] = comm;
            } else {
              obj[comm.scaleValue].id = comm.id;
              obj[comm.scaleValue].comment1 = comm.comment1;
              obj[comm.scaleValue].comment2 = comm.comment2;
              obj[comm.scaleValue].comment3 = comm.comment3;
              obj[comm.scaleValue].comment4 = comm.comment4;
              obj[comm.scaleValue].scaleValue = comm.scaleValue;
              obj[comm.scaleValue].scaleIndex = comm.scaleIndex;
            }

            if (scale_id == $scope.scales.threats.id) {
              $scope.threatCommCache[comm.scaleValue] = $scope._langField(comm, 'comment');

            } else if (scale_id == $scope.scales.vulns.id) {
              $scope.vulnsCommCache[comm.scaleValue] = $scope._langField(comm, 'comment');
            }
          }
        }

        if (scale_id == $scope.scales.threats.id) {
          for (var i = $scope.scales.threats.min; i <= $scope.scales.threats.max; i++) {
            $scope.scaleThreat += i + ' :  ' + $scope.threatCommCache[i] + "\n";
          }
        }
        if (scale_id == $scope.scales.vulns.id) {
          for (var i = $scope.scales.vulns.min; i <= $scope.scales.vulns.max; i++) {
            $scope.scaleVul += i + ' :  ' + $scope.vulnsCommCache[i] + "\n";
          }
        }
      });
    }

    $scope.exportAnr = function(ev) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
          controller: ['$scope', '$mdDialog', 'mode', 'ConfigService', ExportAnrDialog],
          templateUrl: 'views/anr/export.objlibs.html',
          targetEvent: ev,
          preserveScope: false,
          scope: $scope.$dialogScope.$new(),
          clickOutsideToClose: false,
          fullscreen: useFullScreen,
          locals: {
            mode: 'anr',
            ConfigService: ConfigService,
          }
        })
        .then(function(exports) {
          var client = '';
          var customUrl = 'api/anr-export';
          if ($scope.OFFICE_MODE == 'FO') {
            customUrl = 'api/client-anr/' + $scope.model.anr.id + '/export';
          }

          $http.post(customUrl, {
            id: $scope.model.anr.id,
            password: exports.password,
            assessments: exports.assessments,
            methodSteps: exports.methodSteps,
            interviews: exports.interviews,
            interestedParties: exports.interestedParties,
            reassessmentTriggers: exports.reassessmentTriggers,
            controls: exports.controls,
            recommendations: exports.recommendations,
            soas: exports.soas,
            records: exports.records,
            assetsLibrary: exports.assetsLibrary,
            knowledgeBase: exports.knowledgeBase
          }).then(function(data) {
            var contentD = data.headers('Content-Disposition'),
              contentT = data.headers('Content-Type');
            contentD = contentD.substring(0, contentD.length - 1).split('filename="');
            contentD = contentD[contentD.length - 1];
            if (exports.password == '') {
              DownloadService.downloadJSON(data.data, contentD);
            } else {
              DownloadService.downloadBlob(data.data, contentD, contentT);
            }
            toastr.success(gettextCatalog.getString('The risk analysis has been exported successfully.'), gettextCatalog.getString('Export successful'));
          })
        }, function(reject) {
          $scope.handleRejectionDialog(reject);
        });
    };

    $scope.showMethodBox = function(stepNum, step, ev) {
      ev.preventDefault()
      var position = $mdPanel.newPanelPosition()
        .relativeTo('.method-menu-step-' + stepNum)
        .addPanelPosition(stepNum == 4 ? $mdPanel.xPosition.ALIGN_END : $mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.BELOW);

      var animation = $mdPanel.newPanelAnimation();
      animation.withAnimation($mdPanel.animation.FADE);

      var config = {
        animation: animation,
        controller: ['mdPanelRef', '$scope', 'step', 'setMethodStepStatus', 'openMethodDeliverable', MonarcMethodBoxCtrl],
        templateUrl: 'monarc-method.tmpl.html', // inlined in anr.layout.html
        locals: {
          'step': step,
          'setMethodStepStatus': $scope.setMethodStepStatus,
          'openMethodDeliverable': $scope.openMethodDeliverable,
        },
        position: position,
        zIndex: 10,
        openFrom: ev,
        escapeToClose: true,
        clickOutsideToClose: true,
        focusOnOpen: true,
        hasBackdrop: false,
      };

      __panel = $mdPanel.create(config);
      __panel.open();
    }

    $scope.openSnapshotTools = function(ev) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
        controller: ['$scope', '$rootScope', '$mdDialog', '$state', 'ClientSnapshotService', 'toastr', 'gettextCatalog', 'anr', ToolsSnapshotDialog],
        templateUrl: 'views/anr/snapshots.html',
        targetEvent: ev,
        locals: {
          anr: $scope.model.anr
        },
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen
      });
    }

    $scope.openInterviewTools = function(ev) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));

      $mdDialog.show({
        controller: ['$scope', '$mdDialog', 'ClientInterviewService', 'toastr', 'gettextCatalog', 'anr', ToolsInterviewDialog],
        templateUrl: 'views/anr/interviews.html',
        targetEvent: ev,
        locals: {
          anr: $scope.model.anr
        },
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen
      });
    }

    $scope.importObject = function(ev) {
      $mdDialog.cancel();
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
      $mdDialog.show({
        controller: ['$scope', '$mdDialog', 'ObjlibService', 'toastr', 'gettextCatalog', 'Upload', 'hookUpdateObjlib', ImportObjectDialogCtrl],
        templateUrl: 'views/anr/import.object.html',
        targetEvent: ev,
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
        locals: {
          hookUpdateObjlib: $scope.hookUpdateObjlib
        }
      }).then(function() {
        $scope.updateObjectsLibrary();
      }, function(reject) {
        $scope.handleRejectionDialog(reject);
      });
    };

    $scope.importMospObject = function(ev, categories) {
      $mdDialog.cancel();
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
      $mdDialog.show({
          controller: ['$rootScope', '$scope', '$http', '$mdDialog', 'ObjlibService', 'categories', ImportObjectMospDialogCtrl],
          templateUrl: 'views/anr/import.object.mosp.html',
          targetEvent: ev,
          preserveScope: false,
          scope: $scope.$dialogScope.$new(),
          clickOutsideToClose: false,
          fullscreen: useFullScreen,
          locals: {
            categories: categories,
          }
        })
        .then(function(object) {
          var language = $scope.getAnrLanguage();
          var category = object.categories;

          formatRecursive(object);

          function formatRecursive(object, index) {
            if (object.rolfTags === undefined) {
              object.rolfTags = [];
            }
            if (object.rolfRisks === undefined) {
              object.rolfRisks = [];
            }

            object.mosp = true;
            object.type = 'object';
            object.monarc_version = $rootScope.appVersion;
            object.asset.type = "asset";
            object.categories = category;
            object.object.position = index ? index : null;
            object.object.category = 0;
            object.object.rolfTag = object.rolfTags.length > 0 ? 1 : null;
            object.object.scope = object.object.scope == 'local' ? 1 : 2;
            object.object.mode = 0;
            object.object["label" + language] = object.object.label;
            object.object["name" + language] = object.object.name;
            delete object.object.label;
            delete object.object.name;
            object.asset.asset.type = object.asset.asset.type == 'Primary' ? 1 : 2;
            object.asset.asset["label" + language] = object.asset.asset.label;
            object.asset.asset["description" + language] = object.asset.asset.description;
            delete object.asset.asset.label;
            delete object.asset.asset.description;

            let objAmvs = {};
            object.asset.amvs.forEach(amv => {
              let uuid = amv.uuid;
              objAmvs[uuid] = amv;
            })
            object.asset.amvs = objAmvs;

            let themes = [];
            let themeIndex = null;
            let objThreats = {};
            object.asset.threats.forEach(threat => {
              let uuid = threat.uuid;
              let themeFound = themes.filter(function(theme, index) {
                themeIndex = index;
                return theme["label" + language] == threat.theme
              })[0];

              if (themeFound == undefined) {
                themes.push({
                  ["label" + language]: threat.theme
                });
                threat.theme = themes.length - 1;
              } else {
                threat.theme = themeIndex;
              }

              threat["label" + language] = threat.label;
              threat["description" + language] = threat.description;
              delete threat.label;
              delete threat.description;
              objThreats[uuid] = threat;
            })
            object.asset.themes = themes;
            object.asset.threats = objThreats;

            let objVulns = {};
            object.asset.vuls.forEach(vul => {
              let uuid = vul.uuid;
              vul["label" + language] = vul.label;
              vul["description" + language] = vul.description;
              delete vul.label;
              delete vul.description;
              objVulns[uuid] = vul;
            })
            object.asset.vuls = objVulns;

            let objMesures = {};
            object.asset.measures.forEach(measure => {
              let uuid = measure.uuid;
              measure["label" + language] = measure.label;
              measure.category = {
                ["label" + language]: measure.category
              };
              measure.referential = {
                uuid: measure.referential,
                ["label" + language]: measure.referential_label
              };
              delete measure.label;
              delete measure.referential_label;
              objMesures[uuid] = measure;
            })
            object.asset.measures = objMesures;

            object.rolfTags.forEach(tag => {
              tag["label" + language] = tag.label;
              tag.risks = [...Array(object.rolfRisks.length).keys()];
              delete tag.label;
            })
            object.rolfTags.unshift({});

            object.rolfRisks.forEach((opRisk, index) => {
              opRisk['id'] = index;
              opRisk["label" + language] = opRisk.label;
              opRisk["description" + language] = opRisk.description;
              delete opRisk.label;
              delete opRisk.description;
              opRisk.measures.forEach(measure => {
                measure["label" + language] = measure.label;
                measure.category = {
                  ["label" + language]: measure.category
                };
                measure.referential = {
                  uuid: measure.referential,
                  ["label" + language]: measure.referential_label
                };
                delete measure.label;
                delete measure.referential_label;
              })
            })

            if (object.children.length > 0) {
              object.children.forEach((obj, index) => {
                formatRecursive(obj, index + 1);
              })
            }
          }

          ObjlibService.createObjlib(object,
            function() {
              toastr.success(gettextCatalog.getString("The asset has been imported successfully"));
              $scope.hookUpdateObjlib();
            },
            function() {
              toastr.warning(gettextCatalog.getString("Some files could not be imported"));
            }
          );
        }, function(reject) {
          $scope.handleRejectionDialog(reject);
        });
    }

    $scope.importInstance = function(ev, parentId) {
      var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
      $mdDialog.show({
        controller: ['$scope', '$rootScope', '$state', '$mdDialog', 'AnrService', 'toastr', 'gettextCatalog', 'Upload', 'instanceId', 'parentId', 'hookUpdateObjlib', ImportInstanceDialogCtrl],
        templateUrl: 'views/anr/import.instance.html',
        targetEvent: ev,
        preserveScope: false,
        scope: $scope.$dialogScope.$new(),
        locals: {
          instanceId: $rootScope.anr_selected_instance_id,
          parentId: parentId,
          hookUpdateObjlib: $scope.hookUpdateObjlib,
        },
        clickOutsideToClose: false,
        fullscreen: useFullScreen,
      }).then(function(object) {

      }, function(reject) {
        $scope.handleRejectionDialog(reject);
      });
    }

    $scope.openAnrMenu = function($mdMenuEvent, ev) {
      $mdMenuEvent();
    }

    $scope.showSuccessfulMessageOnObjectCreation = function() {
      toastr.success(
        gettextCatalog.getString('The asset has been created successfully.'),
        gettextCatalog.getString('Creation successful')
      );
    }
  }

  // Dialogs

  function MonarcMethodBoxCtrl(mdPanelRef, $scope, step, setMethodStepStatus, openMethodDeliverable) {
    $scope.setMethodStepStatus = setMethodStepStatus;
    $scope.openMethodDeliverable = openMethodDeliverable;
    $scope.step = step;
  }

  var createAttachedObject = function($scope, $mdDialog, $state, $location, $parentScope, AnrService, ev, objlib) {
    $scope.objLibDialog = $mdDialog;
    $scope.__objlibDialog_ParentScope = $parentScope;
    $scope.__objlibDialog_State = $state;
    $scope.__objlibDialog_Location = $location;
    $scope.__objlibDialog_AnrService = AnrService;
    $mdDialog.show({
      controller: ['$scope', '$mdDialog', 'toastr', 'gettextCatalog', 'AssetService', 'ObjlibService', 'ConfigService', 'TagService', '$q', 'mode', 'objLibDialog', 'objlib', '$stateParams', CreateObjlibDialogCtrl],
      templateUrl: 'views/anr/create.objlibs.html',
      clickOutsideToClose: false,
      preserveScope: false,
      scope: $scope.$dialogScope.$new(),
      targetEvent: ev,
      locals: {
        mode: 'anr',
        objLibDialog: $scope,
        objlib: objlib
      }
    }).then(function(objlib) {
      if (objlib) {
        var cont = objlib.cont;
        objlib.cont = undefined;

        var copy = angular.copy(objlib);

        if (objlib.asset) {
          objlib.asset = objlib.asset.uuid;
        }
        if (objlib.rolfTag) {
          objlib.rolfTag = objlib.rolfTag.id;
        }

        var anr;
        if ($scope.model && $scope.model.anr) {
          anr = $scope.model.anr;
        } else if ($parentScope && $parentScope.model && $parentScope.model.anr) {
          anr = $parentScope.model.anr;
        }

        AnrService.addNewObjectToLibrary(anr.id, objlib, function(data) {
          $parentScope.updateObjectsLibrary(false, function() {
            if ($scope.OFFICE_MODE == 'FO') {
              $parentScope.showSuccessfulMessageOnObjectCreation();
              $state.transitionTo('main.project.anr.object', {
                modelId: anr.id,
                objectId: data.id
              });
            } else {
              $location.path('/backoffice/kb/models/' + $parentScope.model.id + '/object/' + data.id);
            }
            if (cont) {
              createAttachedObject($scope, $mdDialog, $state, $location, $parentScope, AnrService, ev);
            }
          });
        }, function() {
          // An error occurred, re-show the dialog
          createAttachedObject($scope, $mdDialog, $state, $location, $parentScope, AnrService, ev, copy);
        });
      }
    }, function(reject) {
      $scope.handleRejectionDialog(reject);
    });
  };

  function AddObjectDialogCtrl($scope, $mdDialog, $q, $state, gettextCatalog, ObjlibService, AnrService, $stateParams, $location, $parentScope, anr_id, categories) {
    $scope.objlib = {
      category: null,
      object: null
    };

    $scope.createAttachedObject = function(ev, objlib) {
      createAttachedObject($scope, $mdDialog, $state, $location, $parentScope, AnrService, ev, objlib);
    }

    $scope.loadCategs = async function() {
      ObjlibService.getObjlibs({category: -1, model: $stateParams.modelId}).then(function(uncategorizedData) {
        ObjlibService.getObjlibsCats({model: $stateParams.modelId}).then(async function(x) {
          await buildItemRecurse(x.categories, "").then(data => {
            let uncategorized = []
            if (uncategorizedData.objects.length) {
              uncategorized.id = -1;
              uncategorizedData.objects.forEach(object => {
                object.isLinkedToAnr = false
              });
              uncategorized.objects = uncategorizedData.objects

              for (let i = 1; i <= 4; i++) {
                uncategorized['label' + i] = gettextCatalog.getString("Uncategorized")
              }
              uncategorized = [uncategorized];
            }
            $scope.categories = uncategorized.concat(data);
          });
        });
      });
    };

    $scope.checkIsLinkedToAnr = function(category) {
        return category.objects.map(object => object.isLinkedToAnr).some(link => !link);
    }

    $scope.changeCateg = async function() {
      $scope.objlib.category = $scope.selected_categ
      $scope.objlib.object = null;

    };

    $scope.changeObject = function() {
      $scope.objlib.object = $scope.selected_object;
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    $scope.createObject = function() {
      $scope.objlib.type = 'object';
      $mdDialog.hide($scope.objlib);
  };

    $scope.createCategory = function() {
      $scope.objlib.type = 'category';
      $mdDialog.hide($scope.objlib);
    };

    async function buildItemRecurse(children, parentPath) {
      var q = $q.defer();
      var output = [];

      for await (var [j, child] of children.entries()) {
        if (parentPath != "") {
          for (let i = 1; i <= 4; i++) {
            child['label' + i] = parentPath['label' + i] + " >> " + child['label' + i];
          }
        }

        if (child.objects.length) {
          output.push(child);
        }

        if (child.child && child.child.length > 0) {
          let parentPathLabels = {};
          for (let i = 1; i <= 4; i++) {
            parentPathLabels['label' + i] = child['label' + i]
          }
          await buildItemRecurse(child.child, parentPathLabels).then(data => {
            let child_output = data;
            output = output.concat(data)
          });
        }
      }
      q.resolve(output);

      return q.promise;
    };
  }

  function ExportAnrDialog($scope, $mdDialog, mode, ConfigService) {
    $scope.mode = mode;
    $scope.exportData = {
      password: '',
      simple_mode: true,
      assessments: ConfigService.isExportDefaultWithEval() ? 1 : 0,
      methodSteps: true,
      interviews: true,
      interestedParties: true,
      reassessmentTriggers: true,
      controls: true,
      recommendations: true,
      soas: true,
      records: true,
      assetsLibrary: true,
      knowledgeBase: true,
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    $scope.export = function() {
      $mdDialog.hide($scope.exportData);
    };
  }

  function ReassessmentTriggersDialog(
    $scope,
    $mdDialog,
    toastr,
    gettextCatalog,
    ReassessmentTriggerService,
    isAnrReadOnly
  ) {
    var otherTriggerOptionId = '__other__';
    $scope.isAnrReadOnly = isAnrReadOnly;
    $scope.dialog = {
      items: [],
      availableTriggers: [],
      loading: true,
      saving: false,
      editingId: null,
      form: {
        selectedTriggerId: null,
        triggerType: '',
        description: '',
        monitoringApproach: '',
        isActive: true
      }
    };

    $scope.onSelectedReassessmentTriggerChange = function() {
      var selectedTrigger = $scope.dialog.availableTriggers.find(function(trigger) {
        return trigger.id === $scope.dialog.form.selectedTriggerId;
      });

      if (!selectedTrigger) {
        $scope.dialog.form.triggerType = '';
        $scope.dialog.form.description = '';
        $scope.dialog.form.monitoringApproach = '';
        return;
      }

      $scope.dialog.form.triggerType = selectedTrigger.triggerType;
      $scope.dialog.form.description = selectedTrigger.description || '';
      $scope.dialog.form.monitoringApproach = selectedTrigger.monitoringApproach || '';
    };

    $scope.refreshReassessmentTriggers = function() {
      $scope.dialog.loading = true;
      ReassessmentTriggerService.getReassessmentTriggers({
        status: 'all'
      }).then(function(data) {
        $scope.dialog.items = data.reassessmentTriggers || [];
        $scope.dialog.availableTriggers = (data.availableReassessmentTriggers || []).concat([{
          id: otherTriggerOptionId,
          triggerType: gettextCatalog.getString('Other'),
          description: '',
          monitoringApproach: ''
        }]);
        $scope.dialog.loading = false;
      }, function() {
        $scope.dialog.loading = false;
      });
    };

    $scope.resetReassessmentTriggerForm = function() {
      $scope.dialog.editingId = null;
      $scope.dialog.form = {
        selectedTriggerId: null,
        triggerType: '',
        description: '',
        monitoringApproach: '',
        isActive: true
      };
    };

    $scope.editReassessmentTrigger = function(trigger) {
      var selectedTrigger = $scope.dialog.availableTriggers.find(function(availableTrigger) {
        return availableTrigger.triggerType === trigger.triggerType;
      });
      $scope.dialog.editingId = trigger.id;
      $scope.dialog.form = {
        selectedTriggerId: selectedTrigger ? selectedTrigger.id : null,
        triggerType: trigger.triggerType || '',
        description: trigger.description,
        monitoringApproach: trigger.monitoringApproach || '',
        isActive: trigger.isActive
      };
    };

    $scope.saveReassessmentTrigger = function() {
      if (
        $scope.isAnrReadOnly
        || !$scope.dialog.form.triggerType
        || !$scope.dialog.form.description
        || !$scope.dialog.form.description.trim()
      ) {
        return;
      }

      var params = angular.copy($scope.dialog.form);
      params.description = params.description.trim();
      params.monitoringApproach = params.monitoringApproach ? params.monitoringApproach.trim() : '';

      $scope.dialog.saving = true;

      if ($scope.dialog.editingId) {
        params.id = $scope.dialog.editingId;
        ReassessmentTriggerService.updateReassessmentTrigger(params, function() {
          toastr.success(gettextCatalog.getString('The reassessment trigger criterion has been updated.'));
          $scope.dialog.saving = false;
          $scope.refreshReassessmentTriggers();
          $scope.resetReassessmentTriggerForm();
        }, function() {
          $scope.dialog.saving = false;
        });

        return;
      }

      params.position = $scope.dialog.items.length + 1;
      ReassessmentTriggerService.createReassessmentTrigger(params, function() {
        toastr.success(gettextCatalog.getString('The reassessment trigger criterion has been created.'));
        $scope.dialog.saving = false;
        $scope.refreshReassessmentTriggers();
        $scope.resetReassessmentTriggerForm();
      }, function() {
        $scope.dialog.saving = false;
      });
    };

    $scope.moveReassessmentTrigger = function(trigger, direction) {
      if ($scope.isAnrReadOnly) {
        return;
      }

      ReassessmentTriggerService.patchReassessmentTrigger({
        id: trigger.id,
        position: trigger.position + direction
      }, function() {
        $scope.refreshReassessmentTriggers();
      });
    };

    $scope.toggleReassessmentTrigger = function(trigger) {
      if ($scope.isAnrReadOnly) {
        return;
      }

      ReassessmentTriggerService.patchReassessmentTrigger({
        id: trigger.id,
        isActive: !trigger.isActive
      }, function() {
        $scope.refreshReassessmentTriggers();
      });
    };

    $scope.deleteReassessmentTrigger = function(trigger, ev) {
      if ($scope.isAnrReadOnly) {
        return;
      }

      var confirm = $mdDialog.confirm()
        .title(gettextCatalog.getString('Delete reassessment trigger criterion?'))
        .textContent(gettextCatalog.getString('This criterion will be removed from the analysis.'))
        .targetEvent(ev)
        .multiple(true)
        .ok(gettextCatalog.getString('Delete'))
        .cancel(gettextCatalog.getString('Cancel'));

      $mdDialog.show(confirm).then(function() {
        ReassessmentTriggerService.deleteReassessmentTrigger(trigger.id, function() {
          toastr.success(gettextCatalog.getString('The reassessment trigger criterion has been deleted.'));
          $scope.refreshReassessmentTriggers();
          if ($scope.dialog.editingId === trigger.id) {
            $scope.resetReassessmentTriggerForm();
          }
        });
      });
    };

    $scope.close = function(updated) {
      $mdDialog.hide(updated);
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    $scope.refreshReassessmentTriggers();
  }

  function MethodEditContextDialog($scope, $mdDialog, toastr, gettextCatalog, GuideService, InterestedPartyService, anr, subStep) {
    $scope.subStep = subStep;
    $scope.guideVisible = false;
    $scope.isAnrReadOnly = !anr.rwd;
    $scope.display = {
      currentTabIndex: 0
    };
    $scope.isInterestedPartiesTabVisible = subStep.anrField == "contextAnaRisk";
    $scope.interestedPartiesDialog = {
      items: [],
      loading: false,
      saving: false,
      editingId: null,
      form: {
        stakeholder: '',
        requirement: ''
      }
    };

    $scope.toggleGuide = function() {
      $scope.guideVisible = !$scope.guideVisible;

      if (!$scope.guide && $scope.guideVisible) {
        GuideService.getGuides().then(function(data) {
          var guide = null;

          for (var i = 0; i < data.guides.length; ++i) {
            var item = data.guides[i];
            if (
              (subStep.anrField == "contextAnaRisk" && item.type_id == 1) ||
              (subStep.anrField == "contextGestRisk" && item.type_id == 2) ||
              (subStep.anrField == "synthThreat" && item.type_id == 3) ||
              (subStep.anrField == "synthAct" && item.type_id == 4)
            ) {
              guide = item;
            }
          }

          if (guide && guide.isWithItems) {
            GuideService.getItems({
              order: 'position',
              guide: guide.id
            }).then(function(itemdata) {
              $scope.guide = guide;
              $scope.guide_items = itemdata['guides-items'];
            });
          } else {
            $scope.guide = guide;
          }
        });
      }
    };

    $scope.context = {
      text: anr[subStep.anrField]
    };

    $scope.refreshInterestedParties = function() {
      if (!$scope.isInterestedPartiesTabVisible) {
        return;
      }

      $scope.interestedPartiesDialog.loading = true;
      InterestedPartyService.getInterestedParties().then(function(data) {
        $scope.interestedPartiesDialog.items = data.interestedParties || [];
        $scope.interestedPartiesDialog.loading = false;
      }, function() {
        $scope.interestedPartiesDialog.loading = false;
      });
    };

    $scope.resetInterestedPartyForm = function() {
      $scope.interestedPartiesDialog.editingId = null;
      $scope.interestedPartiesDialog.form = {
        stakeholder: '',
        requirement: ''
      };
    };

    $scope.editInterestedParty = function(interestedParty) {
      $scope.interestedPartiesDialog.editingId = interestedParty.id;
      $scope.interestedPartiesDialog.form = {
        stakeholder: interestedParty.stakeholder || '',
        requirement: interestedParty.requirement || ''
      };
      $scope.display.currentTabIndex = 1;
    };

    $scope.saveInterestedParty = function() {
      if ($scope.isAnrReadOnly) {
        return;
      }

      var params = angular.copy($scope.interestedPartiesDialog.form);
      params.stakeholder = params.stakeholder ? params.stakeholder.trim() : '';
      params.requirement = params.requirement ? params.requirement.trim() : '';

      if (!params.stakeholder && !params.requirement) {
        return;
      }

      $scope.interestedPartiesDialog.saving = true;

      if ($scope.interestedPartiesDialog.editingId) {
        params.id = $scope.interestedPartiesDialog.editingId;
        InterestedPartyService.updateInterestedParty(params, function() {
          toastr.success(gettextCatalog.getString('The interested party has been updated.'));
          $scope.interestedPartiesDialog.saving = false;
          $scope.refreshInterestedParties();
          $scope.resetInterestedPartyForm();
        }, function() {
          $scope.interestedPartiesDialog.saving = false;
        });

        return;
      }

      params.position = $scope.interestedPartiesDialog.items.length + 1;
      InterestedPartyService.createInterestedParty(params, function() {
        toastr.success(gettextCatalog.getString('The interested party has been created.'));
        $scope.interestedPartiesDialog.saving = false;
        $scope.refreshInterestedParties();
        $scope.resetInterestedPartyForm();
      }, function() {
        $scope.interestedPartiesDialog.saving = false;
      });
    };

    $scope.moveInterestedParty = function(interestedParty, direction) {
      if ($scope.isAnrReadOnly) {
        return;
      }

      InterestedPartyService.patchInterestedParty({
        id: interestedParty.id,
        position: interestedParty.position + direction
      }, function() {
        $scope.refreshInterestedParties();
      });
    };

    $scope.deleteInterestedParty = function(interestedParty, ev) {
      if ($scope.isAnrReadOnly) {
        return;
      }

      var confirm = $mdDialog.confirm()
        .title(gettextCatalog.getString('Delete interested party?'))
        .textContent(gettextCatalog.getString('This interested party will be removed from the analysis.'))
        .targetEvent(ev)
        .multiple(true)
        .ok(gettextCatalog.getString('Delete'))
        .cancel(gettextCatalog.getString('Cancel'));

      $mdDialog.show(confirm).then(function() {
        InterestedPartyService.deleteInterestedParty(interestedParty.id, function() {
          toastr.success(gettextCatalog.getString('The interested party has been deleted.'));
          $scope.refreshInterestedParties();
          if ($scope.interestedPartiesDialog.editingId === interestedParty.id) {
            $scope.resetInterestedPartyForm();
          }
        });
      });
    };

    $scope.trixInitialize = function(e, editor) {
      $scope.trix = editor;
    };

    $scope.insertItem = function(i) {
      $scope.trix.insertString($scope._langField(i, 'description'));
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    $scope.save = function() {
      $mdDialog.hide($scope.context);
    };

    $scope.refreshInterestedParties();
  }

  function MethodEditRisksDialog($scope, $mdDialog, $state, TreatmentPlanService,
    ClientRecommendationService, DownloadService, anr, subStep, thresholds,
    editRecommendationContext, gettextCatalog) {
    $scope.thresholds = thresholds;
    $scope.subStep = subStep;
    $scope.isAnrReadOnly = !anr.rwd;
    $scope.editRecommendationContext = editRecommendationContext;
    $scope.sortableConf = {
      animation: 50,
      handle: '.grab-handle',
      draggable: '.draggable',
      forceFallback: true,
      onUpdate: function(evt) {
        if (evt.newIndex == 0) {
          ClientRecommendationService.updateRecommendation({
            uuid: evt.model.uuid,
            implicitPosition: 1
          });
        } else if (evt.newIndex == $scope.recommendations.length - 1) {
          ClientRecommendationService.updateRecommendation({
            uuid: evt.model.uuid,
            implicitPosition: 2
          });
        } else {
          ClientRecommendationService.updateRecommendation({
            uuid: evt.model.uuid,
            implicitPosition: 3,
            previous: $scope.recommendations[evt.newIndex - 1].uuid
          });
        }

        return true;
      }
    };

    var updatePlan = function() {
      TreatmentPlanService.getTreatmentPlans({
        anr: anr.id
      }).then(function(data) {
        $scope.recommendations = data['recommendations-risks'];

        // Preprocess row spans
        for (var i = 0; i < $scope.recommendations.length; ++i) {
          var rec = $scope.recommendations[i];

          if (rec.risks) {
            rec.risksCount = Object.keys(rec.risks).length;
          } else {
            rec.risksCount = 0;
          }

          if (rec.risksop) {
            rec.risksCount += Object.keys(rec.risksop).length;
          }
        }
      });
    }
    updatePlan();

    $scope.resetPositions = function() {
      TreatmentPlanService.deleteTreatmentPlan({
        anr: anr.id
      }, function(data) {
        updatePlan();
      });
    };
    //temporary function waiting for the ashboard for better export
    $scope.export = function() {
      finalArray = [];
      recLine = 0;
      finalArray[recLine] = gettextCatalog.getString('Code');
      finalArray[recLine] += ',' + gettextCatalog.getString('Recommendation');
      finalArray[recLine] += ',' + gettextCatalog.getString('Imp.');
      finalArray[recLine] += ',' + gettextCatalog.getString('Asset');
      finalArray[recLine] += ',' + gettextCatalog.getString('Existing controls');
      finalArray[recLine] += ',' + gettextCatalog.getString('Current risk');
      finalArray[recLine] += ',' + gettextCatalog.getString('Residual risk');
      updatePlan();
      for (var i = 0; i < $scope.recommendations.length; ++i) {
        var rec = $scope.recommendations[i];
        if (rec.risks) {
          for (risk in rec.risks) {
            recLine++;
            finalArray[recLine] = "\"" + rec.code + "\"";
            if (rec.description != null)
              finalArray[recLine] += ',' + "\"" + rec.description + "\"";
            else
              finalArray[recLine] += ',' + "\"" + ' ' + "\"";
            finalArray[recLine] += ',' + "\"" + rec.importance + "\"";
            finalArray[recLine] += ',' + "\"" + rec.risks[risk].path + "\"";
            if (rec.risks[risk].comment != null)
              finalArray[recLine] += ',' + "\"" + rec.risks[risk].comment + "\"";
            else
              finalArray[recLine] += ',' + "\"" + ' ' + "\"";
            if (rec.risks[risk].cacheMaxRisk.toString() == '-1')
              rec.risks[risk].cacheMaxRisk = ' ';
            if (rec.risks[risk].cacheTargetedRisk.toString() == '-1')
              rec.risks[risk].cacheTargetedRisk = ' ';
            finalArray[recLine] += ',' + rec.risks[risk].cacheMaxRisk;
            finalArray[recLine] += ',' + rec.risks[risk].cacheTargetedRisk;
          }
        }
        if (rec.risksop) {
          for (riskop in rec.risksop) {
            recLine++;
            finalArray[recLine] = "\"" + rec.code + "\"";
            finalArray[recLine] += ',' + "\"" + rec.description + "\"";
            finalArray[recLine] += ',' + "\"" + rec.importance + "\"";
            finalArray[recLine] += ',' + "\"" + rec.risksop[riskop].path + "\"";
            if (rec.risksop[riskop].comment != null)
              finalArray[recLine] += ',' + "\"" + rec.risksop[riskop].comment + "\"";
            else
              finalArray[recLine] += ',' + "\"" + ' ' + "\"";
            if (rec.risksop[riskop].cacheNetRisk.toString() == '-1')
              rec.risksop[riskop].cacheNetRisk = ' ';
            if (rec.risksop[riskop].cacheTargetedRisk.toString() == '-1')
              rec.risksop[riskop].cacheTargetedRisk = ' ';
            finalArray[recLine] += ',' + rec.risksop[riskop].cacheNetRisk;
            finalArray[recLine] += ',' + rec.risksop[riskop].cacheTargetedRisk;
          }
        }
      }

      let csvContent = "";
      for (var j = 0; j < finalArray.length; ++j) {
        let row = finalArray[j].toString().replace(/\n|\r/g, ' ') + "," + "\r\n";
        csvContent += row;
      }

      DownloadService.downloadCSV(csvContent, 'risktreatmantplan.csv', 'text/csv');
    };

    $scope.openRecommendation = function(rec) {
      $state.transitionTo('main.project.anr.risksplan.sheet', {
        modelId: anr.id,
        recId: rec.uuid
      });
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    $scope.save = function() {
      $mdDialog.hide($scope.context);
    };
  }

  function MethodEditTrendsDialog($scope, $mdDialog, toastr, gettextCatalog, QuestionService, ThreatService, ClientAnrService, GuideService, anr, subStep) {

    $scope.subStep = subStep;
    $scope.anr = anr;
    $scope.display = {};
    $scope.isAnrReadOnly = !anr.rwd;
    $scope.guideVisible = false;
    $scope.toggleGuide = function() {
      $scope.guideVisible = !$scope.guideVisible;

      if (!$scope.guide && $scope.guideVisible) {
        GuideService.getGuides().then(function(data) {
          var guide = null;

          for (var i = 0; i < data.guides.length; ++i) {
            var item = data.guides[i];
            if (item.type_id == 3) {
              guide = item;
              break;
            }
          }

          if (guide && guide.isWithItems) {
            GuideService.getItems({
              order: 'position',
              guide: guide.id
            }).then(function(itemdata) {
              $scope.guide = guide;
              $scope.guide_items = itemdata['guides-items'];
            });
          } else {
            $scope.guide = guide;
          }
        });
      }
    };

    $scope.isScalesDefined = function() {
      var progress = false;
      if ($scope.anr.initDefContext == 1) {
        progress = true;
      }
      return progress;
    };

    QuestionService.getQuestions().then(function(data) {
      $scope.questions = angular.copy(data.questions);

      for (var i = 0; i < $scope.questions.length; ++i) {
        var q = $scope.questions[i];

        if (q.type == 2) {
          q.response = JSON.parse(q.response);
        }
      }

      $scope.questionsOriginal = angular.copy($scope.questions);
    });

    $scope.saveQuestions = function() {
      for (var i = 0; i < $scope.questions.length; ++i) {
        if ($scope.questionsOriginal[i] != undefined && $scope.questions[i].id > 0) {
          if ($scope.questions[i].response != $scope.questionsOriginal[i].response) {
            var response = $scope.questions[i].response;

            if ($scope.questions[i].type == 2) {
              response = JSON.stringify(response);
            }

            if ($scope.questions[i].mode == 1) {
              QuestionService.patchQuestion($scope.questions[i].id, {
                response: response,
                label1: $scope.questions[i].label1,
                label2: $scope.questions[i].label2,
                label3: $scope.questions[i].label3,
                label4: $scope.questions[i].label4,
                anr: $scope.anr.id
              });
            } else {
              QuestionService.patchQuestion($scope.questions[i].id, {
                response: response
              });
            }
          }
        } else {
          if ($scope.questions[i].label1 != '' || $scope.questions[i].label2 != '' || $scope.questions[i].label3 != '' || $scope.questions[i].label4 != '') {
            (function(_i) {
              QuestionService.createQuestion($scope.questions[_i], function(q) {
                $scope.questions[_i].id = q.id;
              });
            })(i);
          }
        }
      }
      $scope.questionsOriginal = angular.copy($scope.questions);

      toastr.success(gettextCatalog.getString("Trends assessment saved successfully"));
    };

    $scope.addQuestion = function() {
      $scope.questions.push({
        id: null,
        label1: '',
        label2: '',
        label3: '',
        label4: '',
        type: 1,
        response: '',
        mode: 1,
        anr: $scope.anr.id
      });
    };

    $scope.removeQuestion = function(i) {
      if ($scope.questions[i] != undefined && $scope.questions[i].mode == 1) {
        if ($scope.confirmDelete == $scope.questions[i].id) {
          if ($scope.questions[i].id > 0) {
            QuestionService.deleteQuestion($scope.questions[i].id);
            toastr.success(gettextCatalog.getString("Question deleted"));
          }
          $scope.questions.splice(i, 1);
        } else {
          $scope.confirmDelete = $scope.questions[i].id;
        }
      }
    };

    ThreatService.getThreats({
      limit: 0
    }).then(function(data) {
      $scope.threats = data.threats;
      $scope.display.currentThreat = 0;
      $scope.updateThreat();
    });

    $scope.saveAndUpdateThreat = function() {
      $scope.saveThreat(function() {
        $scope.updateThreat();
      })
    };

    $scope.updateThreat = function() {
      $scope.threatLoading = true;
      var threat = $scope.threats[$scope.display.currentThreat];
      $scope.currentThreatObj = threat;
      ThreatService.getThreat(threat.uuid).then(function(data) {
        $scope.threatLoading = false;
        $scope.currentThreatObj = data;
      })
    };



    $scope.previousThreat = function() {
      $scope.display.currentThreat--;

      if ($scope.evalContextForm.$dirty && $scope.anr.rwd >= 1) {
        $scope.saveThreat(function() {
          $scope.updateThreat();
        });
      } else {
        $scope.updateThreat();
      }
    };

    $scope.nextThreat = function() {
      $scope.display.currentThreat++;

      if ($scope.evalContextForm.$dirty && $scope.anr.rwd >= 1) {
        $scope.saveThreat(function() {
          $scope.updateThreat();
        });
      } else {
        $scope.updateThreat();
      }
    };


    $scope.saveThreat = function(cb) {
      var copy = angular.copy($scope.currentThreatObj);
      if (copy.theme) {
        copy.theme = copy.theme.id;
      }

      ThreatService.updateThreat(copy, function() {
        toastr.success(gettextCatalog.getString("Threat assessment saved successfully"));

        if (cb) {
          cb();
        } else {
          $scope.updateThreat();
        }
      });
    };

    $scope.saveSummary = function() {
      ClientAnrService.updateAnr({
        id: anr.id,
        synthThreat: anr.synthThreat
      }, function() {
        toastr.success(gettextCatalog.getString("Threat evaluation summary saved successfully"));
      });
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    $scope.save = function() {
      $mdDialog.hide($scope.context);
    };
  }

  function ToolsSnapshotDialog($scope, $rootScope, $mdDialog, $state, ClientSnapshotService, toastr, gettextCatalog, anr) {
    var reloadSnapshots = function() {
      ClientSnapshotService.getSnapshots().then(function(data) {
        $scope.snapshots = data.snapshots;
        $scope.snapshotCreating = false;
      });
    };

    $scope.newSnapshot = {
      comment: null
    };
    $scope.isAnrReadOnly = !anr.rwd;
    reloadSnapshots();

    $scope.formatDate = function(input) {
      return input.substring(0, input.lastIndexOf('.'));
    }

    $scope.createSnapshot = function() {
      $scope.snapshotCreating = true;
      ClientSnapshotService.createSnapshot({
        anr: anr.id,
        comment: $scope.newSnapshot.comment
      }, function(data) {
        reloadSnapshots();
        $scope.comment = '';
      })
    };

    $scope.deleteSnapshot = function(snapshot) {
      if ($scope.confirmDelete == snapshot.id) {
        ClientSnapshotService.deleteSnapshot({
          id: snapshot.id
        }, function() {
          reloadSnapshots();
        });
      } else {
        $scope.confirmDelete = snapshot.id;
      }
    };

    $scope.restoreSnapshot = function(snapshot) {
      $scope.snapshotRestoring = true;
      if ($scope.confirmRestore == snapshot.id) {
        ClientSnapshotService.restoreSnapshot(snapshot.id, function(data) {
          toastr.success(gettextCatalog.getString("Snapshot restored"));
          $state.transitionTo('main.project.anr', {
            modelId: data.data.id
          });
          $rootScope.$broadcast('fo-anr-changed');
          $scope.snapshotRestoring = false;
        });
      } else {
        $scope.confirmRestore = snapshot.id;
        $scope.snapshotRestoring = false;
      }
    };

    $scope.openSnapshot = function(snapshot) {
      $state.transitionTo('main.project.anr', {
        modelId: snapshot.anr.id
      });
      $mdDialog.cancel();
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };
  }

  function ToolsInterviewDialog($scope, $mdDialog, ClientInterviewService, toastr, gettextCatalog, anr) {
    $scope.isAnrReadOnly = !anr.rwd;
    $scope.showInterviewForm = false;

    $scope.toggleInterviewForm = function() {
      $scope.showInterviewForm = !$scope.showInterviewForm;
    }

    var reloadInterviews = function() {
      $scope.new_interview = {
        date: null,
        service: null,
        content: null
      }
      ClientInterviewService.getInterviews({
        anr: anr.id
      }).then(function(data) {
        $scope.interviews = data.interviews;
        $scope.interviewCreating = false;
      });
    };

    reloadInterviews();

    $scope.createInterview = function() {
      $scope.interviewCreating = true;

      if ($scope.new_interview.id > 0) {
        ClientInterviewService.updateInterview({
          id: $scope.new_interview.id,
          anr: anr.id,
          date: $scope.new_interview.date,
          service: $scope.new_interview.service,
          content: $scope.new_interview.content
        }, function() {
          reloadInterviews();
          $scope.toggleInterviewForm();
        });
      } else {
        ClientInterviewService.createInterview({
          anr: anr.id,
          date: $scope.new_interview.date,
          service: $scope.new_interview.service,
          content: $scope.new_interview.content
        }, function() {
          reloadInterviews();
          $scope.toggleInterviewForm();
        });
      }
    };

    $scope.editInterview = function(interview) {
      $scope.new_interview = angular.copy(interview);
      $scope.showInterviewForm = true;
    }

    $scope.deleteInterview = function(interview) {
      if ($scope.confirmDelete == interview.id) {
        ClientInterviewService.deleteInterview({
          anr: anr.id,
          id: interview.id
        }, function() {
          reloadInterviews();
        }, function() {
          $scope.interviewCreating = false;
        });
      } else {
        $scope.confirmDelete = interview.id;
      }
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };
  }

  function MethodDeliverableDialog($scope, $mdDialog, $http, anr, step) {
    $scope.step = step;
    $scope.deliverable = {
      'version': '',
      'template': 0,
      'status': 0,
      'classification': '',
      'docname': '',
      'managers': '',
      'consultants': '',
      'summaryEvalRisk': '',
      'typedoc': step.num,
      'risksByControl': false,
    };

    $http.get('api/client-anr/' + anr.id + '/deliverable/' + step.num).then(function(data) {
      if (data.data.delivery && data.data.delivery.id) {
        $scope.deliverable = data.data.delivery;
        $scope.deliverable.docname = $scope.deliverable.name;
        $scope.deliverable.managers = $scope.deliverable.respSmile;
        $scope.deliverable.consultants = $scope.deliverable.respCustomer;
        $scope.deliverable.template = $scope.deliverable.template;

      }
      if (step.referential) {
        $scope.deliverable.referential = step.referential;
        $scope.deliverable.risksByControl = false;
      }
      if (step.record) {
        $scope.deliverable.record = step.record;
      }
    });

    $scope.save = function() {
      $mdDialog.hide($scope.deliverable);
    }

    $scope.cancel = function() {
      $mdDialog.cancel();
    };
  }

  function AddScaleDialogCtrl($scope, $mdDialog, language) {
    $scope.language = language;
    let labels = {};
    labels[$scope.languages[$scope.language].code] = null;

    if ($scope.OFFICE_MODE == 'BO') {
      for (language in $scope.languages) {
        labels[$scope.languages[language].code] = null;
      };
    }
    $scope.scale = {
      label: labels
    };

    $scope.create = function() {
      $mdDialog.hide($scope.scale);
    }

    $scope.createAndContinue = function() {
      $scope.scale.cont = true;
      $mdDialog.hide($scope.scale);
    }

    $scope.cancel = function() {
      $mdDialog.cancel();
    };
  }

  function DeleteScaleDialogCtrl($scope, $mdDialog, gettextCatalog, scales, forceValidator, language) {
    $scope.scales = angular.copy(scales);
    $scope.language = language;
    $scope.validator = true;

    $scope.scaleSelected = function() {
      $scope.validator = true;
      $scope.idsScalesSelected = $scope.scales
        .filter(scale => scale.selected == true)
        .map(scale => scale.id);

      if ($scope.idsScalesSelected.length !== 0 && $scope.idsScalesSelected.length !== $scope.scales.length) {
        $scope.validator = false;
      }
      if (forceValidator) {
        $scope.validator = false;
      }
    }

    $scope.delete = function(ev) {
      let confirm = $mdDialog.confirm()
        .title(gettextCatalog.getString('Are you sure you want to delete the {{count}} scales selected ?', {
          count: $scope.idsScalesSelected.length
        }))
        .textContent(gettextCatalog.getString('This operation is irreversible.'))
        .targetEvent(ev)
        .theme('light')
        .multiple(true)
        .ok(gettextCatalog.getString('Delete'))
        .cancel(gettextCatalog.getString('Cancel'));
      $mdDialog.show(confirm).then(function() {
        $mdDialog.hide($scope.idsScalesSelected);
      });
    }
    $scope.cancel = function() {
      $mdDialog.cancel();
    };
  }

  function ImportObjectDialogCtrl($scope, $mdDialog, ObjlibService, toastr, gettextCatalog, Upload, hookUpdateObjlib) {
    $scope.file = [];
    $scope.file_range = 0;
    $scope.isImportingIn = false;
    $scope.import = {
      mode: 'merge',
      password: '',
    };

    $scope.uploadFile = function(file) {
      $scope.isImportingIn = true;
      file.upload = Upload.upload({
        url: 'api/client-anr/' + $scope.getUrlAnrId() + '/objects/import',
        data: {
          'mode': $scope.import.mode,
          file: file,
          password: $scope.import.password
        }
      });

      file.upload.then(function(response) {
        $scope.isImportingIn = false;
        if (response.data.errors && response.data.errors.length > 0) {
          toastr.warning(gettextCatalog.getString("Some files could not be imported"));
        } else {
          toastr.success(gettextCatalog.getString("The asset has been imported successfully"));
          hookUpdateObjlib();
          $mdDialog.cancel();

        }

      });
    }

    $scope.upgradeFileRange = function() {
      $scope.file_range++;

      for (var i = 0; i <= $scope.file_range; ++i) {
        if ($scope.file[i] == undefined) {
          $scope.file[i] = {};
        }
      }
    };

    $scope.$watchGroup(['assets.filter'], function(newValue, oldValue) {
      if (newValue != oldValue) {
        $scope.updateAssets();
      }

    });

    $scope.assets = {
      filter: null
    };

    $scope.updateAssets = function() {
      var filter = angular.copy($scope.assets.filter);
      ObjlibService.getObjectsCommon({
        filter: filter
      }).then(function(data) {
        $scope.objects = data.objects;
      });
    };

    $scope.openCommonList = function() {
      $scope.dialog_mode = 'common';
      $scope.updateAssets();
    };

    $scope.openObjectDetails = function(object) {
      $scope.dialog_mode = 'object_details';
      $scope.object_details = object;

      ObjlibService.getObjectCommon(object.uuid).then(function(data) {
        $scope.object_details = data;
      })
    };

    $scope.closeObjectDetails = function() {
      $scope.dialog_mode = 'common';
    };

    $scope.importObjectCommon = function() {
      ObjlibService.importObjectCommon($scope.object_details.uuid, $scope.import.mode, function() {
        toastr.success(gettextCatalog.getString("The asset has been imported successfully"));
        hookUpdateObjlib();
        $scope.dialog_mode = 'common';
      });
    };

    $scope.cancel = function() {
        if ($scope.dialog_mode) {
            $scope.dialog_mode = null;
        } else {
            $mdDialog.cancel();
        }
    };
  }

  function ImportObjectMospDialogCtrl($rootScope, $scope, $http, $mdDialog, ObjlibService, categories) {

    $scope.language = $scope.getAnrLanguage();
    $scope.categories = categories;

    var mosp_query_organizations = 'v2/organization/?per_page=500';
    $http.get($rootScope.mospApiUrl + mosp_query_organizations)
      .then(function(org) {
        var mosp_query_all_objects = 'v2/object/?schema=Library objects&per_page=3000';
        $http.get($rootScope.mospApiUrl + mosp_query_all_objects)
          .then(function(objects) {
            $scope.all_objects = objects.data.data.filter(object => !angular.equals({}, object.json_object));
            var org_ids = Array.from(new Set($scope.all_objects.map(object => object.organization.id)));
            $scope.organizations = org.data.data.filter(org => org_ids.includes(org.id));
            $scope.hideSpinLoader = true;
          });
      });

    $scope.selectOrganization = function() {
      // Retrieve the assets from the selected organization
      $scope.searchText = '';
      $scope.mosp_objects = [];
      $scope.hideSpinLoader = false;
      $scope.dataLoaded = false;
      ObjlibService.getObjectsOfAnr($rootScope.anr_id, {}, function(data) {
        $scope.mosp_objects = $scope.all_objects.filter(
          object => object.organization.id == $scope.organization.id &&
          !data.objects.map(object => object.uuid).includes(object.json_object.object.object.uuid) &&
          object.json_object.object.object.language == $rootScope.languages[$scope.language].code.toUpperCase()
        );
        $scope.hideSpinLoader = true;
        $scope.dataLoaded = true;
      });
    }

    $scope.getMatches = function(searchText) {
      return $scope.mosp_objects.filter(r => r['name'].toLowerCase().includes(searchText.toLowerCase()));
    };

    $scope.createCategory = function(ev) {
      $mdDialog.show({
          controller: ['$scope', '$mdDialog', '$q', 'toastr', 'gettextCatalog', 'ConfigService', 'ObjlibService', 'categories', CreateObjlibCategoryDialogCtrl],
          templateUrl: 'views/anr/create.objlibs.categories.html',
          clickOutsideToClose: false,
          preserveScope: true,
          multiple: true,
          scope: $scope,
          locals: {
            'categories': $scope.categories
          }
        })
        .then(function(category) {
          let path = category.path;
          ObjlibService.createObjlibCat(category,
            function(cat) {
              cat.categ['label' + $scope.language] = (path ? path + ' >> ' + cat.categ['label' + $scope.language] : cat.categ['label' + $scope.language]);
              $scope.categorySelected = cat.categ
              $scope.categories.push(cat.categ);
            }
          );
        }, function(reject) {
          $scope.handleRejectionDialog(reject);
        });
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    $scope.import = function() {
      let libraryCategory = [];
      let categories = $scope.categorySelected['label' + $scope.language].split(' >> ');
      let object = $scope.object.json_object.object;

      categories
        .reverse()
        .forEach((category, index) => {
          libraryCategory.push({
            ['label' + $scope.language]: category,
            parent: (index == categories.length - 1 ? null : index + 1)
          })
        })

      object['categories'] = libraryCategory;

      $mdDialog.hide(object);
    };
  }

  function SupervisorsDialog($scope, $mdDialog, toastr, gettextCatalog, AnrService, anr, isAnrReadOnly, canManageLinkedUsers) {
    $scope.anr = anr;
    $scope.isAnrReadOnly = isAnrReadOnly;
    $scope.canManageLinkedUsers = !!canManageLinkedUsers;
    $scope.supervisors = [];
    $scope.loading = false;
    $scope.saving = false;
    $scope.roleOptions = [
      {
        value: 'risk_owner',
        label: gettextCatalog.getString('Risk owner')
      },
      {
        value: 'residual_risk_approver',
        label: gettextCatalog.getString('Residual risk approver')
      }
    ];

    function emptyForm() {
      return {
        id: null,
        name: '',
        email: '',
        rolePosition: '',
        isActive: true,
        roles: {
          risk_owner: false,
          residual_risk_approver: false
        },
        linkedUser: null,
        linkedUserSearchText: ''
      };
    }

    $scope.form = emptyForm();

    $scope.resetSupervisorFormValidationState = function() {
      if (!$scope.supervisorsForm) {
        return;
      }

      $scope.supervisorsForm.$setPristine();
      $scope.supervisorsForm.$setUntouched();
    };

    $scope.loadSupervisors = function() {
      $scope.loading = true;
      AnrService.getAnrSupervisors($scope.anr.id, {}).then(function(data) {
        $scope.supervisors = data.supervisors || [];
      }).finally(function() {
        $scope.loading = false;
      });
    };

    $scope.queryLinkableUsers = function(query) {
      if (!$scope.canManageLinkedUsers) {
        return [];
      }

      return AnrService.getAnrSupervisors($scope.anr.id, {
        userFilter: (query || '').trim()
      }).then(function(data) {
        return data.users || [];
      });
    };

    $scope.getLinkedUserFullName = function(linkedUser) {
      if (!linkedUser) {
        return '';
      }

      var fullName = ((linkedUser.firstname || '') + ' ' + (linkedUser.lastname || '')).trim();

      if (fullName) {
        return fullName;
      }

      return linkedUser.email || '';
    };

    $scope.isLinkedUserSelected = function() {
      return !!($scope.form && $scope.form.linkedUser && $scope.form.linkedUser.id);
    };

    $scope.syncFormIdentityFromLinkedUser = function() {
      if (!$scope.isLinkedUserSelected()) {
        return;
      }

      $scope.form.name = $scope.getLinkedUserFullName($scope.form.linkedUser);
      $scope.form.email = $scope.form.linkedUser.email || '';
      $scope.form.linkedUserSearchText = $scope.getLinkedUserFullName($scope.form.linkedUser);
      $scope.resetSupervisorFormValidationState();
    };

    $scope.onLinkedUserChange = function() {
      $scope.syncFormIdentityFromLinkedUser();
    };

    $scope.resetForm = function() {
      $scope.form = emptyForm();
      $scope.resetSupervisorFormValidationState();
    };

    $scope.getSelectedRoles = function() {
      return Object.keys($scope.form.roles).filter(function(role) {
        return !!$scope.form.roles[role];
      });
    };

    $scope.getSupervisorRolesLabel = function(supervisor) {
      var roles = (supervisor && supervisor.roles) || [];

      return roles.map(function(role) {
        var option = $scope.roleOptions.find(function(item) {
          return item.value === role;
        });

        return option ? option.label : role;
      }).join(', ');
    };

    $scope.getLinkedUserLabel = function(supervisor) {
      if (!supervisor || !supervisor.linkedUser) {
        return '';
      }

      var linkedUser = supervisor.linkedUser;
      var fullName = ((linkedUser.firstname || '') + ' ' + (linkedUser.lastname || '')).trim();

      if (!fullName) {
        return linkedUser.email || '';
      }

      return linkedUser.email ? fullName + ' - ' + linkedUser.email : fullName;
    };

    $scope.canManageSupervisor = function(supervisor) {
      return $scope.canManageLinkedUsers || !(supervisor && supervisor.linkedUser);
    };

    $scope.canEditSupervisor = function(supervisor) {
      return !$scope.isAnrReadOnly && $scope.canManageSupervisor(supervisor);
    };

    $scope.canToggleSupervisor = function(supervisor) {
      return !$scope.isAnrReadOnly && $scope.canManageSupervisor(supervisor);
    };

    $scope.saveSupervisor = function() {
      $scope.syncFormIdentityFromLinkedUser();

      var payload = {
        name: ($scope.form.name || '').trim(),
        email: ($scope.form.email || '').trim() || null,
        rolePosition: ($scope.form.rolePosition || '').trim() || null,
        linkedUserId: $scope.form.linkedUser ? $scope.form.linkedUser.id : null,
        isActive: !!$scope.form.isActive,
        roles: $scope.getSelectedRoles()
      };

      if (!payload.name) {
        return;
      }

      if (payload.linkedUserId && !$scope.canManageLinkedUsers) {
        return;
      }

      $scope.saving = true;
      var action = $scope.form.id ? AnrService.updateAnrSupervisor : AnrService.createAnrSupervisor;
      var args = $scope.form.id
        ? [$scope.anr.id, $scope.form.id, payload]
        : [$scope.anr.id, payload];

      args.push(function() {
        toastr.success(gettextCatalog.getString('Supervisor saved'));
        $scope.resetForm();
        $scope.loadSupervisors();
        $scope.saving = false;
      }, function() {
        $scope.saving = false;
      });

      action.apply(null, args);
    };

    $scope.toggleSupervisor = function(supervisor) {
      if (!supervisor || !$scope.canManageSupervisor(supervisor)) {
        return;
      }

      AnrService.patchAnrSupervisor($scope.anr.id, supervisor.id, {
        isActive: supervisor.isActive === false
      }, function() {
        toastr.success(gettextCatalog.getString(
          supervisor.isActive === false ? 'Supervisor activated' : 'Supervisor deactivated'
        ));
        $scope.loadSupervisors();
      });
    };

    $scope.editSupervisor = function(supervisor) {
      if (!$scope.canManageSupervisor(supervisor)) {
        return;
      }

      $scope.form = {
        id: supervisor.id,
        name: supervisor.name || '',
        email: supervisor.email || '',
        rolePosition: supervisor.rolePosition || '',
        isActive: supervisor.isActive !== false,
        roles: {
          risk_owner: (supervisor.roles || []).indexOf('risk_owner') !== -1,
          residual_risk_approver: (supervisor.roles || []).indexOf('residual_risk_approver') !== -1
        },
        linkedUser: supervisor.linkedUser || null,
        linkedUserSearchText: supervisor.linkedUser
          ? ((supervisor.linkedUser.firstname || '') + ' ' + (supervisor.linkedUser.lastname || '')).trim()
          : ''
      };
      $scope.syncFormIdentityFromLinkedUser();
      $scope.resetSupervisorFormValidationState();
    };

    $scope.sendEmail = function(supervisor) {
      if (!supervisor || !supervisor.email) {
        return;
      }

      window.location.href = 'mailto:' + supervisor.email;
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    $scope.loadSupervisors();
  }

  function EditLinkedUserDialogCtrl($scope, $mdDialog, ClientAnrService, user) {
    ClientAnrService.getAnrs().then(function(data) {
      $scope.anrs = data.anrs;
      $scope.anrs.sort(function(a, b) {
        var str1 = a['label' + a.language];
        var str2 = b['label' + b.language];
        return ((str1 == str2) ? 0 : ((str1 > str2) ? 1 : -1));
      });

      for (var i = 0; i < $scope.anrs.length; ++i) {
        if (!$scope.anrById[$scope.anrs[i].id]) {
          $scope.anrById[$scope.anrs[i].id] = $scope.anrs[i];
          $scope.anrs[i].rwd = -1;
        }
      }
    });

    $scope.anrById = {};
    $scope.user = angular.copy(user || {});
    $scope.user.password = undefined;
    $scope.user.currentAnr = undefined;

    if ($scope.user.anrs) {
      for (var i = 0; i < $scope.user.anrs.length; ++i) {
        $scope.anrById[$scope.user.anrs[i].id] = $scope.user.anrs[i];
      }
    }

    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    $scope.create = function() {
      var cleanedAnrs = [];
      for (var i in $scope.anrById) {
        var anr = $scope.anrById[i];

        if (anr.rwd >= 0) {
          cleanedAnrs.push({id: i, rwd: anr.rwd});
        }
      }

      $scope.user.anrs = cleanedAnrs;
      $mdDialog.hide($scope.user);
    };
  }

  function ImportInstanceDialogCtrl($scope, $rootScope, $state, $mdDialog, AnrService, toastr, gettextCatalog, Upload, instanceId, parentId, hookUpdateObjlib) {
    $scope.file = [];
    $scope.file_range = 0;
    $scope.isImportingIn = false;
    $scope.isBackgroundProcessActive = $rootScope.isBackgroundProcessActive;
    $scope.import = {
      mode: 'merge',
      password: '',
      createSnapshot: $scope.isBackgroundProcessActive,
    };

    $scope.uploadFile = function(file) {
      $scope.isImportingIn = true;
      file.upload = Upload.upload({
        url: 'api/client-anr/' + $scope.getUrlAnrId() + '/instances/import',
        data: {
          'mode': $scope.import.mode,
          file: file,
          password: $scope.import.password,
          idparent: parentId,
          createSnapshot : $scope.import.createSnapshot
        }
      });

      file.upload.then(function(response) {
        $scope.isImportingIn = false;
        if (response.data.errors && response.data.errors.length > 0) {
          toastr.warning(gettextCatalog.getString("Some files could not be imported"));
        } else {
          if (response.data.isBackgroundProcess) {
            toastr.success(
              gettextCatalog.getString("The import process is added to the queue and will be executed soon.")
            );
            $rootScope.$broadcast('fo-anr-changed');
            $state.transitionTo('main.project');
          } else {
            toastr.success(gettextCatalog.getString("The instance has been imported successfully"));
            hookUpdateObjlib();
          }
          $mdDialog.cancel();
        }
      });
    }

    $scope.upgradeFileRange = function() {
      $scope.file_range++;

      for (var i = 0; i <= $scope.file_range; ++i) {
        if ($scope.file[i] == undefined) {
          $scope.file[i] = {};
        }
      }
    };

    $scope.cancel = function() {
      $mdDialog.cancel();
    };
  }

})();
