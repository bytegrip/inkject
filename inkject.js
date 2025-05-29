class inkject {
    render(template, data = {}, delimiter = '&&') {
        const [openDelim, closeDelim] = this.parseDelimiter(delimiter);
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const openPattern = escapeRegex(openDelim);
        const closePattern = escapeRegex(closeDelim);

        let result = template;
        result = this.processConditionals(result, data, openPattern, closePattern);
        result = this.processVariables(result, data, openPattern, closePattern);

        return result;
    }

    parseDelimiter(delimiter) {
        const len = delimiter.length;
        if (len % 2 === 0) {
            const mid = len / 2;
            return [delimiter.slice(0, mid), delimiter.slice(mid)];
        } else {
            return [delimiter, delimiter];
        }
    }

    processConditionals(template, data, openPattern, closePattern) {
        const conditionalRegex = new RegExp(
            `${openPattern}#if\\s+([^${closePattern.charAt(0)}]+?)${closePattern}([\\s\\S]*?)(?:${openPattern}#elseif\\s+([^${closePattern.charAt(0)}]+?)${closePattern}([\\s\\S]*?))*(?:${openPattern}#else${closePattern}([\\s\\S]*?))?${openPattern}/if${closePattern}`,
            'g'
        );

        return template.replace(conditionalRegex, (fullMatch) => {
            return this.processComplexConditional(fullMatch, data, openPattern, closePattern);
        });
    }

    processComplexConditional(match, data, openPattern, closePattern) {
        const blocks = [];
        const ifMatch = new RegExp(`${openPattern}#if\\s+([^${closePattern.charAt(0)}]+?)${closePattern}`).exec(match);
        if (ifMatch) {
            blocks.push({ type: 'if', condition: ifMatch[1].trim() });
        }

        const elseifRegex = new RegExp(`${openPattern}#elseif\\s+([^${closePattern.charAt(0)}]+?)${closePattern}`, 'g');
        let elseifMatch;
        while ((elseifMatch = elseifRegex.exec(match)) !== null) {
            blocks.push({ type: 'elseif', condition: elseifMatch[1].trim() });
        }

        if (match.includes(`${this.unescapeRegex(openPattern)}#else${this.unescapeRegex(closePattern)}`)) {
            blocks.push({ type: 'else' });
        }

        const content = this.extractConditionalContent(match, openPattern, closePattern, blocks);

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (block.type === 'else' || this.evaluateCondition(block.condition, data)) {
                return content[i] || '';
            }
        }

        return '';
    }

    extractConditionalContent(match, openPattern, closePattern, blocks) {
        const unescapedOpen = this.unescapeRegex(openPattern);
        const unescapedClose = this.unescapeRegex(closePattern);

        const parts = match.split(new RegExp(`${openPattern}(?:#(?:if|elseif|else)|/if)(?:\\s+[^${closePattern.charAt(0)}]*?)?${closePattern}`));
        return parts.slice(1, -1);
    }

    unescapeRegex(str) {
        return str.replace(/\\(.)/g, '$1');
    }

    processVariables(template, data, openPattern, closePattern) {
        const varRegex = new RegExp(`${openPattern}([^#/][^${closePattern.charAt(0)}]*?)${closePattern}`, 'g');

        return template.replace(varRegex, (match, variable) => {
            const value = this.getValue(variable.trim(), data);
            return value !== undefined ? String(value) : '';
        });
    }

    evaluateCondition(condition, data) {
        if (!condition) return false;

        condition = condition.trim();

        if (condition.startsWith('!')) {
            return !this.evaluateCondition(condition.slice(1), data);
        }

        const operators = ['===', '!==', '==', '!=', '>=', '<=', '>', '<'];
        for (const op of operators) {
            if (condition.includes(op)) {
                const [left, right] = condition.split(op).map(s => s.trim());
                const leftValue = this.getValue(left, data);
                const rightValue = this.parseValue(right);

                switch (op) {
                    case '===': return leftValue === rightValue;
                    case '!==': return leftValue !== rightValue;
                    case '==': return leftValue == rightValue;
                    case '!=': return leftValue != rightValue;
                    case '>=': return leftValue >= rightValue;
                    case '<=': return leftValue <= rightValue;
                    case '>': return leftValue > rightValue;
                    case '<': return leftValue < rightValue;
                }
            }
        }

        const value = this.getValue(condition, data);
        return Boolean(value);
    }

    getValue(path, data) {
        const keys = path.split('.');
        let current = data;

        for (const key of keys) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[key];
        }

        return current;
    }

    parseValue(value) {
        value = value.trim();

        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }

        if (!isNaN(value) && !isNaN(parseFloat(value)) && value !== '') {
            return parseFloat(value);
        }

        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null') return null;
        if (value === 'undefined') return undefined;

        return value;
    }
}

module.exports = inkject;