import {
    ChangeItem,
    Column,
    ConfigType,
    EventCallback,
    EVirtTableOptions,
    FilterMethod,
    Position,
    ValidateItemError,
} from './types';
import Context from './Context';
import Scroller from './Scroller';
import Header from './Header';
import Body from './Body';
import Footer from './Footer';
import Selector from './Selector';
import Autofill from './Autofill';
import Tooltip from './Tooltip';
import Editor from './Editor';
import Empty from './Empty';
import Overlayer from './Overlayer';
import ContextMenu from './ContextMenu';
import './style.css';
export default class EVirtTable {
    private options: EVirtTableOptions;
    private scroller: Scroller;
    private header: Header;
    private body: Body;
    private footer: Footer;
    private selector: Selector;
    private autofill: Autofill;
    private tooltip: Tooltip;
    private editor: Editor;
    private empty: Empty;
    private overlayer: Overlayer;
    private contextMenu: ContextMenu;
    ctx: Context;
    constructor(target: HTMLDivElement, options: EVirtTableOptions) {
        this.options = options;
        const { overlayerElement } = options;
        const containerElement = this.createContainer(target, overlayerElement);
        this.ctx = new Context(containerElement, this.options);
        this.header = new Header(this.ctx);
        this.body = new Body(this.ctx);
        this.footer = new Footer(this.ctx);
        this.scroller = new Scroller(this.ctx);
        this.selector = new Selector(this.ctx);
        this.autofill = new Autofill(this.ctx);
        this.tooltip = new Tooltip(this.ctx);
        this.empty = new Empty(this.ctx);
        this.editor = new Editor(this.ctx);
        this.overlayer = new Overlayer(this.ctx);
        this.contextMenu = new ContextMenu(this.ctx);
        this.ctx.on('draw', () => {
            this.draw();
        });
        this.ctx.on('drawView', () => {
            this.draw(true);
        });
        this.draw();
    }
    private createContainer(containerElement: HTMLDivElement, _overlayerElement?: HTMLDivElement) {
        containerElement.className = 'e-virt-table-container';
        const stageElement = document.createElement('div');
        const canvasElement = document.createElement('canvas');
        const overlayerElement = _overlayerElement || document.createElement('div');
        stageElement.className = 'e-virt-table-stage';
        canvasElement.className = 'e-virt-table-canvas';
        overlayerElement.className = 'e-virt-table-overlayer';
        stageElement.appendChild(canvasElement);
        stageElement.appendChild(overlayerElement);
        containerElement.appendChild(stageElement);
        return {
            containerElement,
            stageElement,
            canvasElement,
            overlayerElement,
        };
    }
    draw(ignoreOverlayer = false) {
        requestAnimationFrame(() => {
            this.header.update();
            this.footer.update();
            this.body.update();
            this.ctx.paint.clear();
            this.body.draw();
            this.footer.draw();
            this.header.draw();
            this.scroller.draw();
            // 忽略重绘覆盖层，解决按下事件时，重绘覆盖层导致事件无法触发，目前只在Selector中使用
            if (!ignoreOverlayer) {
                this.overlayer.draw();
            }
        });
    }
    loadConfig(_config: ConfigType) {
        this.ctx.config.init(_config);
        this.ctx.database.init();
        this.header.init();
        // 更新右键菜单，有可能配置项变化
        this.contextMenu.updated();
        this.ctx.emit('draw');
    }
    loadColumns(columns: Column[]) {
        // 先关闭编辑
        this.editor.doneEdit();
        this.ctx.database.setColumns(columns);
        this.header.init();
        this.ctx.emit('draw');
    }
    loadData(data: any[]) {
        // 先关闭编辑
        this.editor.doneEdit();
        this.ctx.database.setData(data);
        this.header.init();
        this.ctx.emit('draw');
    }
    loadFooterData(data: any[]) {
        this.ctx.database.setFooterData(data);
        this.ctx.emit('draw');
    }

    setLoading(ladong: boolean) {
        this.ctx.database.setLoading(ladong);
    }
    on(event: string, callback: EventCallback) {
        this.ctx.on(event, callback);
    }
    off(event: string, callback: EventCallback) {
        this.ctx.off(event, callback);
    }
    filterMethod(func: FilterMethod) {
        this.ctx.setScrollY(0);
        this.ctx.setScrollX(0);
        this.ctx.database.init();
        this.ctx.database.setFilterMethod(func);
        this.ctx.emit('draw');
    }
    editCell(rowIndex: number, colIndex: number) {
        this.editor.editCell(rowIndex, colIndex);
    }
    setItemValue(rowKey: string, key: string, value: any, history = true, reDraw = true, isEditor = false) {
        this.ctx.database.setItemValue(rowKey, key, value, history, reDraw, isEditor);
    }
    batchSetItemValue(list: ChangeItem[], history = true, reDraw = true) {
        this.ctx.database.batchSetItemValue(list, history);
        if (reDraw) {
            this.ctx.emit('draw');
        }
    }
    setItemValueByEditor(rowKey: string, key: string, value: any, history = true, reDraw = true) {
        this.ctx.database.setItemValue(rowKey, key, value, history, reDraw, true);
        this.editor.doneEdit();
    }
    doLayout() {
        this.ctx.emit('draw');
    }
    getChangedData() {
        return this.ctx.database.getChangedData();
    }
    getChangedRows() {
        return this.ctx.database.getChangedRows();
    }
    clearValidate() {
        this.ctx.database.clearValidate();
        this.ctx.emit('draw');
    }
    async validate(scrollError = true) {
        // 先关闭编辑
        this.editor.doneEdit();
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.getValidations();
                resolve(res);
            } catch (errors) {
                // 滚动到错误位置，取第一个错误
                if (scrollError && Array.isArray(errors) && errors.length) {
                    const [err] = errors;
                    if (Array.isArray(err) && err.length) {
                        const [_err] = err;
                        const { rowKey, key } = _err;
                        this.scrollToRowkey(rowKey);
                        this.scrollToColkey(key);
                    }
                }
                reject(errors);
            }
        });
    }
    setValidations(errors: ValidateItemError[]) {
        errors.forEach((item) => {
            const { rowIndex, key, message } = item;
            this.ctx.database.setValidationErrorByRowIndex(rowIndex, key, message);
        });
        // 滚动到错误位置，取第一个错误
        if (errors && Array.isArray(errors) && errors.length) {
            const [err] = errors;
            if (err && err.rowIndex >= 0 && err.key) {
                const { rowIndex, key } = err;
                this.scrollToRowIndex(rowIndex);
                this.scrollToColkey(key);
            }
        }
    }
    getValidations() {
        return new Promise(async (resolve, reject) => {
            const data = this.ctx.database.getAllRowsData();
            const leafCellHeaders = this.ctx.header.leafCellHeaders;
            let errors: any[] = [];
            for (let i = 0; i < data.length; i++) {
                for (let y = 0; y < leafCellHeaders.length; y++) {
                    const rowKey = this.ctx.database.getRowKeyByItem(data[i]);
                    const leafCellHeader = leafCellHeaders[y];
                    const key = leafCellHeader.key;
                    const _errors = await this.ctx.database.getValidator(rowKey, key);
                    if (Array.isArray(_errors) && _errors.length) {
                        errors.push(_errors);
                    }
                }
            }
            if (errors.length) {
                reject(errors);
                this.ctx.emit('draw');
            } else {
                resolve([]);
                this.ctx.emit('draw');
            }
        });
    }
    scrollTo(x: number, y: number) {
        this.scrollXTo(x);
        this.scrollYTo(y);
    }

    scrollXTo(x: number) {
        this.ctx.setScrollX(x);
    }

    scrollToColkey(key: string) {
        this.scroller.scrollToColkey(key);
    }
    scrollToRowkey(key: string) {
        this.scroller.scrollToRowKey(key);
    }
    scrollToColIndex(colIndex: number) {
        this.scroller.scrollToColIndex(colIndex);
    }
    scrollToRowIndex(rowIndex: number) {
        this.scroller.scrollToRowIndex(rowIndex);
    }
    scrollYTo(y: number) {
        this.ctx.setScrollY(y);
    }
    clearSelection() {
        this.ctx.database.clearSelection();
        this.ctx.emit('draw');
    }
    toggleRowSelection(row: any) {
        const rowKey = this.ctx.database.getRowKeyByItem(row);
        this.ctx.database.toggleRowSelection(rowKey);
        this.ctx.emit('draw');
    }
    setSelectionByRows(rows: any[], selected = true) {
        rows.forEach((row) => {
            const rowKey = this.ctx.database.getRowKeyByItem(row);
            this.ctx.database.setRowSelection(rowKey, selected);
        });
        this.ctx.emit('selectionChange', this.getSelectionRows());
        this.ctx.emit('draw');
    }
    setSelectionByRowKeys(keys: string[], selected = true) {
        keys.forEach((key) => {
            this.ctx.database.setRowSelection(key, selected);
        });
        this.ctx.emit('selectionChange', this.getSelectionRows());
        this.ctx.emit('draw');
    }
    toggleAllSelection() {
        this.ctx.database.toggleAllSelection();
        this.ctx.emit('draw');
    }
    toggleRowExpand(rowKey: string, expand: boolean) {
        this.ctx.database.expandItem(rowKey, expand);
        this.ctx.emit('draw');
    }
    toggleExpandAll(expand: boolean) {
        this.ctx.database.expandAll(expand);
        this.ctx.emit('draw');
    }
    getSelectionRows() {
        return this.ctx.database.getSelectionRows();
    }
    getPositionForRowIndex(rowIndex: number): Position {
        return this.ctx.database.getPositionForRowIndex(rowIndex);
    }
    getCellValue(rowKey: string, key: string) {
        return this.ctx.database.getItemValue(rowKey, key);
    }
    getCellValueByIndex(rowIndex: number, colIndex: number) {
        return this.ctx.database.getItemValueForRowIndexAndColIndex(rowIndex, colIndex);
    }
    /**
     * 销毁
     */
    destroy() {
        this.overlayer.destroy();
        this.empty.destroy();
        this.editor.destroy();
        this.tooltip.destroy();
        this.selector.destroy();
        this.autofill.destroy();
        this.contextMenu.destroy();
        this.ctx.destroy();
        this.ctx.containerElement.remove();
    }
}
