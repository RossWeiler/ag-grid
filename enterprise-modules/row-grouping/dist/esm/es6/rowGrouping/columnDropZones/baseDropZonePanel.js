var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Autowired, Component, DragSourceType, Events, HorizontalDirection, KeyCode, ManagedFocusFeature, PositionableFeature, VerticalDirection, _ } from "@ag-grid-community/core";
import { DropZoneColumnComp } from "./dropZoneColumnComp";
export class BaseDropZonePanel extends Component {
    constructor(horizontal, dropZonePurpose) {
        super(/* html */ `<div class="ag-unselectable" role="presentation"></div>`);
        this.horizontal = horizontal;
        this.dropZonePurpose = dropZonePurpose;
        this.state = BaseDropZonePanel.STATE_NOT_DRAGGING;
        this.guiDestroyFunctions = [];
        this.childColumnComponents = [];
        this.resizeEnabled = false;
        this.addElementClasses(this.getGui());
        this.eColumnDropList = document.createElement('div');
        this.addElementClasses(this.eColumnDropList, 'list');
        _.setAriaRole(this.eColumnDropList, 'listbox');
    }
    isHorizontal() {
        return this.horizontal;
    }
    toggleResizable(resizable) {
        this.positionableFeature.setResizable(resizable ? { bottom: true } : false);
        this.resizeEnabled = resizable;
    }
    setBeans(beans) {
        this.beans = beans;
    }
    destroy() {
        this.destroyGui();
        super.destroy();
    }
    destroyGui() {
        this.guiDestroyFunctions.forEach(func => func());
        this.guiDestroyFunctions.length = 0;
        this.childColumnComponents.length = 0;
        _.clearElement(this.getGui());
        _.clearElement(this.eColumnDropList);
    }
    init(params) {
        this.params = params;
        this.createManagedBean(new ManagedFocusFeature(this.getFocusableElement(), {
            handleKeyDown: this.handleKeyDown.bind(this)
        }));
        this.addManagedListener(this.beans.eventService, Events.EVENT_NEW_COLUMNS_LOADED, this.refreshGui.bind(this));
        this.addManagedListener(this.beans.gridOptionsWrapper, 'functionsReadOnly', this.refreshGui.bind(this));
        this.setupDropTarget();
        this.positionableFeature = new PositionableFeature(this.getGui(), { minHeight: 100 });
        this.createManagedBean(this.positionableFeature);
        // we don't know if this bean will be initialised before columnModel.
        // if columnModel first, then below will work
        // if columnModel second, then below will put blank in, and then above event gets first when columnModel is set up
        this.refreshGui();
        _.setAriaLabel(this.eColumnDropList, this.getAriaLabel());
    }
    handleKeyDown(e) {
        const isVertical = !this.horizontal;
        let isNext = e.key === KeyCode.DOWN;
        let isPrevious = e.key === KeyCode.UP;
        if (!isVertical) {
            const isRtl = this.gridOptionsWrapper.isEnableRtl();
            isNext = (!isRtl && e.key === KeyCode.RIGHT) || (isRtl && e.key === KeyCode.LEFT);
            isPrevious = (!isRtl && e.key === KeyCode.LEFT) || (isRtl && e.key === KeyCode.RIGHT);
        }
        if (!isNext && !isPrevious) {
            return;
        }
        const el = this.focusService.findNextFocusableElement(this.getFocusableElement(), false, isPrevious);
        if (el) {
            e.preventDefault();
            el.focus();
        }
    }
    addElementClasses(el, suffix) {
        suffix = suffix ? `-${suffix}` : '';
        const direction = this.horizontal ? 'horizontal' : 'vertical';
        el.classList.add(`ag-column-drop${suffix}`, `ag-column-drop-${direction}${suffix}`);
    }
    setupDropTarget() {
        this.dropTarget = {
            getContainer: this.getGui.bind(this),
            getIconName: this.getIconName.bind(this),
            onDragging: this.onDragging.bind(this),
            onDragEnter: this.onDragEnter.bind(this),
            onDragLeave: this.onDragLeave.bind(this),
            onDragStop: this.onDragStop.bind(this),
            isInterestedIn: this.isInterestedIn.bind(this)
        };
        this.beans.dragAndDropService.addDropTarget(this.dropTarget);
    }
    isInterestedIn(type) {
        // not interested in row drags
        return type === DragSourceType.HeaderCell || type === DragSourceType.ToolPanel;
    }
    checkInsertIndex(draggingEvent) {
        const newIndex = this.horizontal ? this.getNewHorizontalInsertIndex(draggingEvent) : this.getNewVerticalInsertIndex(draggingEvent);
        // <0 happens when drag is no a direction we are interested in, eg drag is up/down but in horizontal panel
        if (newIndex < 0) {
            return false;
        }
        const changed = newIndex !== this.insertIndex;
        if (changed) {
            this.insertIndex = newIndex;
        }
        return changed;
    }
    getNewHorizontalInsertIndex(draggingEvent) {
        if (_.missing(draggingEvent.hDirection)) {
            return -1;
        }
        let newIndex = 0;
        const mouseEvent = draggingEvent.event;
        const enableRtl = this.beans.gridOptionsWrapper.isEnableRtl();
        const goingLeft = draggingEvent.hDirection === HorizontalDirection.Left;
        const mouseX = mouseEvent.clientX;
        this.childColumnComponents.forEach(childColumn => {
            const rect = childColumn.getGui().getBoundingClientRect();
            const rectX = goingLeft ? rect.right : rect.left;
            const horizontalFit = enableRtl ? mouseX <= rectX : mouseX >= rectX;
            if (horizontalFit) {
                newIndex++;
            }
        });
        return newIndex;
    }
    getNewVerticalInsertIndex(draggingEvent) {
        if (_.missing(draggingEvent.vDirection)) {
            return -1;
        }
        let newIndex = 0;
        const mouseEvent = draggingEvent.event;
        this.childColumnComponents.forEach(childColumn => {
            const rect = childColumn.getGui().getBoundingClientRect();
            const verticalFit = mouseEvent.clientY >= (draggingEvent.vDirection === VerticalDirection.Down ? rect.top : rect.bottom);
            if (verticalFit) {
                newIndex++;
            }
        });
        return newIndex;
    }
    checkDragStartedBySelf(draggingEvent) {
        if (this.state !== BaseDropZonePanel.STATE_NOT_DRAGGING) {
            return;
        }
        this.state = BaseDropZonePanel.STATE_REARRANGE_COLUMNS;
        this.potentialDndColumns = draggingEvent.dragSource.getDragItem().columns || [];
        this.refreshGui();
        this.checkInsertIndex(draggingEvent);
        this.refreshGui();
    }
    onDragging(draggingEvent) {
        this.checkDragStartedBySelf(draggingEvent);
        if (this.checkInsertIndex(draggingEvent)) {
            this.refreshGui();
        }
    }
    onDragEnter(draggingEvent) {
        // this will contain all columns that are potential drops
        const dragColumns = draggingEvent.dragSource.getDragItem().columns || [];
        this.state = BaseDropZonePanel.STATE_NEW_COLUMNS_IN;
        // take out columns that are not droppable
        const goodDragColumns = dragColumns.filter(this.isColumnDroppable.bind(this));
        if (goodDragColumns.length > 0) {
            const hideColumnOnExit = this.isRowGroupPanel() && !this.gridOptionsWrapper.isSuppressRowGroupHidesColumns() && !draggingEvent.fromNudge;
            if (hideColumnOnExit) {
                const dragItem = draggingEvent.dragSource.getDragItem();
                const columns = dragItem.columns;
                this.setColumnsVisible(columns, false, "uiColumnDragged");
            }
            this.potentialDndColumns = goodDragColumns;
            this.checkInsertIndex(draggingEvent);
            this.refreshGui();
        }
    }
    setColumnsVisible(columns, visible, source = "api") {
        if (columns) {
            const allowedCols = columns.filter(c => !c.getColDef().lockVisible);
            this.colModel.setColumnsVisible(allowedCols, visible, source);
        }
    }
    isPotentialDndColumns() {
        return _.existsAndNotEmpty(this.potentialDndColumns);
    }
    isRowGroupPanel() {
        return this.dropZonePurpose === 'rowGroup';
    }
    onDragLeave(draggingEvent) {
        // if the dragging started from us, we remove the group, however if it started
        // some place else, then we don't, as it was only 'asking'
        if (this.state === BaseDropZonePanel.STATE_REARRANGE_COLUMNS) {
            const columns = draggingEvent.dragSource.getDragItem().columns || [];
            this.removeColumns(columns);
        }
        if (this.isPotentialDndColumns()) {
            const hideColumnOnExit = this.isRowGroupPanel() && !this.gridOptionsWrapper.isSuppressMakeColumnVisibleAfterUnGroup() && !draggingEvent.fromNudge;
            if (hideColumnOnExit) {
                const dragItem = draggingEvent.dragSource.getDragItem();
                const hiddenCols = this.potentialDndColumns.filter(col => { var _a, _b; return _b = (_a = dragItem.visibleState) === null || _a === void 0 ? void 0 : _a[col.getId()], (_b !== null && _b !== void 0 ? _b : false); });
                const visibleCols = this.potentialDndColumns.filter(col => { var _a, _b; return !(_b = (_a = dragItem.visibleState) === null || _a === void 0 ? void 0 : _a[col.getId()], (_b !== null && _b !== void 0 ? _b : false)); });
                this.setColumnsVisible(hiddenCols, false, "uiColumnDragged");
                this.setColumnsVisible(visibleCols, true, "uiColumnDragged");
            }
            this.potentialDndColumns = [];
            this.refreshGui();
        }
        this.state = BaseDropZonePanel.STATE_NOT_DRAGGING;
    }
    onDragStop() {
        if (this.isPotentialDndColumns()) {
            let success = false;
            if (this.state === BaseDropZonePanel.STATE_NEW_COLUMNS_IN) {
                this.addColumns(this.potentialDndColumns);
                success = true;
            }
            else {
                success = this.rearrangeColumns(this.potentialDndColumns);
            }
            this.potentialDndColumns = [];
            // If the function is passive, then we don't refresh, as we assume the client application
            // is going to call setRowGroups / setPivots / setValues at a later point which will then
            // cause a refresh. This gives a nice GUI where the ghost stays until the app has caught
            // up with the changes. However, if there was no change in the order, then we do need to
            // refresh to reset the columns
            if (!this.beans.gridOptionsWrapper.isFunctionsPassive() || !success) {
                this.refreshGui();
            }
        }
        this.state = BaseDropZonePanel.STATE_NOT_DRAGGING;
    }
    removeColumns(columnsToRemove) {
        const newColumnList = this.getExistingColumns().filter(col => !_.includes(columnsToRemove, col));
        this.updateColumns(newColumnList);
    }
    addColumns(columnsToAdd) {
        if (!columnsToAdd) {
            return;
        }
        const newColumnList = this.getExistingColumns().slice();
        const colsToAddNoDuplicates = columnsToAdd.filter(col => newColumnList.indexOf(col) < 0);
        _.insertArrayIntoArray(newColumnList, colsToAddNoDuplicates, this.insertIndex);
        this.updateColumns(newColumnList);
    }
    rearrangeColumns(columnsToAdd) {
        const newColumnList = this.getNonGhostColumns().slice();
        _.insertArrayIntoArray(newColumnList, columnsToAdd, this.insertIndex);
        if (_.areEqual(newColumnList, this.getExistingColumns())) {
            return false;
        }
        this.updateColumns(newColumnList);
        return true;
    }
    refreshGui() {
        // we reset the scroll position after the refresh.
        // if we don't do this, then the list will always scroll to the top
        // each time we refresh it. this is because part of the refresh empties
        // out the list which sets scroll to zero. so the user could be just
        // reordering the list - we want to prevent the resetting of the scroll.
        // this is relevant for vertical display only (as horizontal has no scroll)
        const scrollTop = this.eColumnDropList.scrollTop;
        const resizeEnabled = this.resizeEnabled;
        const focusedIndex = this.getFocusedItem();
        let alternateElement = this.focusService.findNextFocusableElement();
        if (!alternateElement) {
            alternateElement = this.focusService.findNextFocusableElement(undefined, false, true);
        }
        this.toggleResizable(false);
        this.destroyGui();
        this.addIconAndTitleToGui();
        this.addEmptyMessageToGui();
        this.addColumnsToGui();
        if (!this.isHorizontal()) {
            this.eColumnDropList.scrollTop = scrollTop;
        }
        if (resizeEnabled) {
            this.toggleResizable(resizeEnabled);
        }
        this.restoreFocus(focusedIndex, alternateElement);
    }
    getFocusedItem() {
        const eGui = this.getGui();
        const activeElement = this.gridOptionsWrapper.getDocument().activeElement;
        if (!eGui.contains(activeElement)) {
            return -1;
        }
        const items = Array.from(eGui.querySelectorAll('.ag-column-drop-cell'));
        return items.indexOf(activeElement);
    }
    restoreFocus(index, alternateElement) {
        const eGui = this.getGui();
        const items = Array.from(eGui.querySelectorAll('.ag-column-drop-cell'));
        if (index === -1) {
            return;
        }
        if (items.length === 0) {
            alternateElement.focus();
        }
        const indexToFocus = Math.min(items.length - 1, index);
        const el = items[indexToFocus];
        if (el) {
            el.focus();
        }
    }
    getNonGhostColumns() {
        const existingColumns = this.getExistingColumns();
        if (this.isPotentialDndColumns()) {
            return existingColumns.filter(column => !_.includes(this.potentialDndColumns, column));
        }
        return existingColumns;
    }
    addColumnsToGui() {
        const nonGhostColumns = this.getNonGhostColumns();
        const addingGhosts = this.isPotentialDndColumns();
        const itemsToAddToGui = [];
        nonGhostColumns.forEach((column, index) => {
            if (addingGhosts && index >= this.insertIndex) {
                return;
            }
            const columnComponent = this.createColumnComponent(column, false);
            itemsToAddToGui.push(columnComponent);
        });
        if (this.isPotentialDndColumns()) {
            this.potentialDndColumns.forEach(column => {
                const columnComponent = this.createColumnComponent(column, true);
                itemsToAddToGui.push(columnComponent);
            });
            nonGhostColumns.forEach((column, index) => {
                if (index < this.insertIndex) {
                    return;
                }
                const columnComponent = this.createColumnComponent(column, false);
                itemsToAddToGui.push(columnComponent);
            });
        }
        this.appendChild(this.eColumnDropList);
        itemsToAddToGui.forEach((columnComponent, index) => {
            if (index > 0) {
                this.addArrow(this.eColumnDropList);
            }
            this.eColumnDropList.appendChild(columnComponent.getGui());
        });
        this.addAriaLabelsToComponents();
    }
    addAriaLabelsToComponents() {
        this.childColumnComponents.forEach((comp, idx) => {
            const eGui = comp.getGui();
            _.setAriaPosInSet(eGui, idx + 1);
            _.setAriaSetSize(eGui, this.childColumnComponents.length);
        });
    }
    createColumnComponent(column, ghost) {
        const columnComponent = new DropZoneColumnComp(column, this.dropTarget, ghost, this.dropZonePurpose, this.horizontal);
        columnComponent.addEventListener(DropZoneColumnComp.EVENT_COLUMN_REMOVE, this.removeColumns.bind(this, [column]));
        this.beans.context.createBean(columnComponent);
        this.guiDestroyFunctions.push(() => this.destroyBean(columnComponent));
        if (!ghost) {
            this.childColumnComponents.push(columnComponent);
        }
        return columnComponent;
    }
    addIconAndTitleToGui() {
        const eGroupIcon = this.params.icon;
        const eTitleBar = document.createElement('div');
        eTitleBar.setAttribute('aria-hidden', 'true');
        this.addElementClasses(eTitleBar, 'title-bar');
        this.addElementClasses(eGroupIcon, 'icon');
        this.addOrRemoveCssClass('ag-column-drop-empty', this.isExistingColumnsEmpty());
        eTitleBar.appendChild(eGroupIcon);
        if (!this.horizontal) {
            const eTitle = document.createElement('span');
            this.addElementClasses(eTitle, 'title');
            eTitle.innerHTML = this.params.title;
            eTitleBar.appendChild(eTitle);
        }
        this.appendChild(eTitleBar);
    }
    isExistingColumnsEmpty() {
        return this.getExistingColumns().length === 0;
    }
    addEmptyMessageToGui() {
        if (!this.isExistingColumnsEmpty() || this.isPotentialDndColumns()) {
            return;
        }
        const eMessage = document.createElement('span');
        eMessage.innerHTML = this.params.emptyMessage;
        this.addElementClasses(eMessage, 'empty-message');
        this.eColumnDropList.appendChild(eMessage);
    }
    addArrow(eParent) {
        // only add the arrows if the layout is horizontal
        if (this.horizontal) {
            // for RTL it's a left arrow, otherwise it's a right arrow
            const enableRtl = this.beans.gridOptionsWrapper.isEnableRtl();
            const icon = _.createIconNoSpan(enableRtl ? 'smallLeft' : 'smallRight', this.beans.gridOptionsWrapper);
            this.addElementClasses(icon, 'cell-separator');
            eParent.appendChild(icon);
        }
    }
}
BaseDropZonePanel.STATE_NOT_DRAGGING = 'notDragging';
BaseDropZonePanel.STATE_NEW_COLUMNS_IN = 'newColumnsIn';
BaseDropZonePanel.STATE_REARRANGE_COLUMNS = 'rearrangeColumns';
__decorate([
    Autowired('columnModel')
], BaseDropZonePanel.prototype, "colModel", void 0);
__decorate([
    Autowired('focusService')
], BaseDropZonePanel.prototype, "focusService", void 0);
//# sourceMappingURL=baseDropZonePanel.js.map