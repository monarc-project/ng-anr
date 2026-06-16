angular.module('AnrModule').directive('historyResizableTable', ['$document', '$timeout', function($document, $timeout) {
    return {
        restrict: 'A',
        link: function(scope, element) {
            var minColumnWidth = 120;
            var table = element[0];
            var resizeState = null;
            var initializePromise = null;
            var isInitialized = false;

            function getColumns() {
                return Array.prototype.slice.call(table.querySelectorAll('colgroup col'));
            }

            function syncTableWidth(columns) {
                var totalWidth = columns.reduce(function(sum, column) {
                    return sum + column.getBoundingClientRect().width;
                }, 0);

                if (totalWidth > 0) {
                    table.style.width = totalWidth + 'px';
                    table.style.minWidth = totalWidth + 'px';
                    table.style.maxWidth = totalWidth + 'px';
                }
            }

            function applyWidth(column, width) {
                column.style.width = width + 'px';
                column.style.minWidth = width + 'px';
                column.style.maxWidth = width + 'px';
            }

            function freezeCurrentColumnWidths(columns) {
                columns.forEach(function(column) {
                    applyWidth(column, column.getBoundingClientRect().width);
                });
                syncTableWidth(columns);
            }

            function stopResize() {
                if (!resizeState) {
                    return;
                }

                resizeState = null;
                table.classList.remove('history-table-resizing');
                $document.off('mousemove', onMouseMove);
                $document.off('mouseup', stopResize);
            }

            function scheduleInitialize(delay) {
                if (initializePromise || isInitialized) {
                    return;
                }

                initializePromise = $timeout(function() {
                    initializePromise = null;
                    initialize();
                }, delay || 100, false);
            }

            function startResize(event, columnIndex) {
                event.preventDefault();
                event.stopPropagation();

                var columns = getColumns();
                freezeCurrentColumnWidths(columns);

                columns = getColumns();
                var column = columns[columnIndex];
                var nextColumn = columns[columnIndex + 1];
                if (!column || !nextColumn) {
                    return;
                }

                resizeState = {
                    startX: event.pageX,
                    startWidth: column.getBoundingClientRect().width,
                    nextStartWidth: nextColumn.getBoundingClientRect().width,
                    pairWidth: column.getBoundingClientRect().width + nextColumn.getBoundingClientRect().width,
                    columnIndex: columnIndex
                };

                table.classList.add('history-table-resizing');

                $document.on('mousemove', onMouseMove);
                $document.on('mouseup', stopResize);
            }

            function onMouseMove(event) {
                if (!resizeState) {
                    return;
                }

                var columns = getColumns();
                var column = columns[resizeState.columnIndex];
                var nextColumn = columns[resizeState.columnIndex + 1];
                if (!column || !nextColumn) {
                    stopResize();
                    return;
                }

                var delta = event.pageX - resizeState.startX;
                var maxCurrentWidth = resizeState.pairWidth - minColumnWidth;
                var nextWidth = Math.max(
                    minColumnWidth,
                    Math.min(maxCurrentWidth, resizeState.startWidth + delta)
                );
                var adjacentWidth = resizeState.pairWidth - nextWidth;

                applyWidth(column, nextWidth);
                applyWidth(nextColumn, adjacentWidth);
            }

            function initialize() {
                if (isInitialized) {
                    return;
                }

                if (table.offsetWidth === 0) {
                    scheduleInitialize(100);
                    return;
                }

                var headerCells = Array.prototype.slice.call(table.querySelectorAll('thead th'));
                var columns = getColumns();
                if (!headerCells.length || columns.length !== headerCells.length) {
                    return;
                }

                headerCells.forEach(function(cell, index) {
                    cell.classList.add('history-resizable-header');

                    if (!columns[index].style.width) {
                        applyWidth(columns[index], cell.getBoundingClientRect().width);
                    }

                    if (index === headerCells.length - 1 || cell.querySelector('.history-resize-handle')) {
                        return;
                    }

                    var handle = document.createElement('div');
                    handle.className = 'history-resize-handle';
                    handle.addEventListener('mousedown', function(event) {
                        startResize(event, index);
                    });
                    cell.appendChild(handle);
                });

                freezeCurrentColumnWidths(columns);
                isInitialized = true;
            }

            scheduleInitialize(0);

            scope.$on('$destroy', function() {
                stopResize();
                if (initializePromise) {
                    $timeout.cancel(initializePromise);
                }
            });
        }
    };
}]);
