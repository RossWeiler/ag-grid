const cell = {
    getTemplate(c) {
        var _a, _b;
        const { mergeAcross, styleId, data } = c;
        const properties = {};
        if (mergeAcross) {
            properties.MergeAcross = mergeAcross;
        }
        if (styleId) {
            properties.StyleID = styleId;
        }
        return {
            name: "Cell",
            properties: {
                prefixedAttributes: [{
                        prefix: "ss:",
                        map: properties
                    }]
            },
            children: [{
                    name: "Data",
                    properties: {
                        prefixedAttributes: [{
                                prefix: "ss:",
                                map: {
                                    Type: (_a = data) === null || _a === void 0 ? void 0 : _a.type
                                }
                            }]
                    },
                    textNode: (_b = data) === null || _b === void 0 ? void 0 : _b.value
                }]
        };
    }
};
export default cell;
//# sourceMappingURL=cell.js.map