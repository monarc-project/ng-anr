Run the Angular Material question-dropdown regression tests from `ng-anr` using
the workspace's installed Playwright and FrontOffice Angular libraries:

```sh
NODE_PATH=../scenario-ui/node_modules node --test tests/question-select.test.cjs
```

To check the same shared template against BackOffice's Angular libraries:

```sh
MONARC_ANGULAR_MODULES=../ng-backoffice/node_modules NODE_PATH=../scenario-ui/node_modules node --test tests/question-select.test.cjs
```

The tests compile the actual dropdowns from `views/trends.evalcontext.html` in
Chromium. They cover selecting and clearing a single answer, deselecting all
multiple answers, and the read-only state. They use installed local libraries
and require a Playwright Chromium installation.

Run the ROPA workflow checks using the same installed libraries:

```sh
NODE_PATH=../scenario-ui/node_modules node --test tests/ropa.test.cjs
```

These checks compile the actual ROPA template, controller, record service and
inline editor. HTTP responses are fixtures. They cover selection, search,
single-field saves and failed saves, read-only navigation, mobile scrolling,
creation and duplication, URL selection, selected/full-register Word parameters,
JSON downloads, CSV downloads with empty categories, and exports while filtering.
The shared analysis-layout checks cover workflow placement and both offices,
including the original 32px MONARC logo at the end of the progress line above
the white card, on the surrounding shell background, and
method controls available on every FrontOffice tab. The empty-register creation
test runs inside the actual analysis shell.
Four viewport checks verify 8px gaps around the progress strip/card, full height
below the actual Material toolbar and FrontOffice progress strip, and natural
expansion for long content at desktop, laptop,
mobile portrait and mobile landscape sizes. No package or lockfile changes are
required.

Run all analysis startup, SOA, ROPA and question checks together:

```sh
NODE_PATH=../scenario-ui/node_modules node --test tests/analysis-initialization.test.cjs tests/ropa.test.cjs tests/question-select.test.cjs
```

Set `MONARC_ANGULAR_MODULES=../ng-backoffice/node_modules` to repeat these
31 checks against BackOffice's installed Angular libraries. The six startup/SOA
checks exercise both office branches, delayed configuration, independent SOA
state, empty/replaced referentials, late measure responses, listener cleanup and
updates while Angular Material disconnects an inactive tab. They use the actual
controllers and deferred service fixtures. Four further checks use the actual
analysis controller, Material method panels and angular-ui-tree to cover method
checkboxes in both directions and library-to-analysis dragging, with writable and
read-only access. Service callbacks are fixtures; these tests do not write to
an installed analysis. Neither AngularJS package defines
separate lint, type-check or build scripts; also run `node --check` on changed
JavaScript files.
