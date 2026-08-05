(function () {

    angular
        .module('AnrModule')
        .factory('AnalysisReviewService', ['gettextCatalog', AnalysisReviewService]);

    function AnalysisReviewService(gettextCatalog) {
        var getDueDate = function (anr) {
            if (!anr || !anr.reassessmentLastReviewDate || !anr.reassessmentReviewFrequency) {
                return null;
            }

            var dateParts = String(anr.reassessmentLastReviewDate).slice(0, 10).split('-');
            if (dateParts.length !== 3) {
                return null;
            }

            var lastReviewDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            if (isNaN(lastReviewDate.getTime())) {
                return null;
            }

            var monthsByFrequency = {
                'Monthly': 1,
                'Quarterly': 3,
                'Semi-annually': 6,
                'Annually': 12
            };
            var months = monthsByFrequency[anr.reassessmentReviewFrequency];
            if (!months) {
                return null;
            }

            var dueDate = new Date(lastReviewDate.getFullYear(), lastReviewDate.getMonth() + months, 1);
            var lastDayOfDueMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
            dueDate.setDate(Math.min(lastReviewDate.getDate(), lastDayOfDueMonth));

            return dueDate;
        };

        var isOverdue = function (anr) {
            var dueDate = getDueDate(anr);
            if (!dueDate) {
                return false;
            }

            var today = new Date();
            today.setHours(0, 0, 0, 0);

            return today > dueDate;
        };

        var getOverdueTooltip = function (anr) {
            return gettextCatalog.getString(
                'This risk analysis requires attention. The last review date was {{date}}.',
                {date: anr.reassessmentLastReviewDate}
            );
        };

        return {
            getDueDate: getDueDate,
            isOverdue: isOverdue,
            getOverdueTooltip: getOverdueTooltip
        };
    }

})();
