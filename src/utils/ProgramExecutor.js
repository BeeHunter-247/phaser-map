/**
 * ProgramExecutor - Thực thi chương trình robot từ Blockly JSON
 */
import { checkAndDisplayVictory } from "./VictoryConditions.js";
export class ProgramExecutor {
  constructor(scene) {
    this.scene = scene;
    this.program = null;
    this.currentStep = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.executionSpeed = 1000; // ms between commands
    this.timer = null;
    this.functions = new Map(); // Lưu trữ các hàm đã định nghĩa
    this.variableContext = {}; // Lưu giá trị biến hiện tại
    this.usedStatements = new Set(); // Lưu trữ các statement đã sử dụng
    // Lưu trữ chương trình gốc (chưa parse) và thống kê block
    this.originalProgramData = null;
    this.totalRawBlocks = 0;
  }

  /**
   * Load và validate chương trình từ JSON
   * @param {Object} programData - Blockly JSON program
   * @returns {boolean} Success/failure
   */
  loadProgram(programData) {
    try {
      // Validate program structure
      if (
        !programData.version ||
        !programData.actions ||
        !Array.isArray(programData.actions)
      ) {
        throw new Error("Invalid program structure");
      }

      // Reset used statements khi load program mới
      this.usedStatements.clear();

      // Lưu chương trình gốc và đếm tổng số block raw trước khi parse/flatten
      this.originalProgramData = JSON.parse(JSON.stringify(programData));
      this.totalRawBlocks = this.countRawBlocks(this.originalProgramData);

      // Xử lý function definitions trước
      this.functions.clear();
      if (programData.functions && Array.isArray(programData.functions)) {
        for (const func of programData.functions) {
          this.functions.set(func.name, {
            name: func.name,
            actions: this.parseActions(func.body || []),
            original: func,
          });
          console.log(`🔧 Defined function: ${func.name}`);
        }
      }

      // Parse và validate actions
      const parsedActions = this.parseActions(programData.actions);

      this.program = {
        version: programData.version,
        programName: programData.programName || "unnamed",
        actions: parsedActions,
      };

      console.log(`📋 Program loaded: ${this.program.programName}`);
      console.log(`   Version: ${this.program.version}`);
      console.log(`   Actions: ${this.program.actions.length}`);
      console.log(`   Functions: ${this.functions.size}`);
      console.log(`   Raw blocks (pre-parse): ${this.totalRawBlocks}`);
      console.log(
        `🧮 Star inputs preview -> statementNumber: ${
          this.scene?.mapModel?.victoryConditions?.statementNumber ??
          this.scene?.challengeConfig?.victory?.statementNumber ??
          this.scene?.challengeJson?.statementNumber ??
          0
        }, totalRawBlocks: ${this.totalRawBlocks}`
      );

      return true;
    } catch (error) {
      console.error("❌ Failed to load program:", error.message);
      return false;
    }
  }

  /**
   * Đếm tổng số block (loại) trong JSON chương trình gốc trước khi parse
   * - Tính tất cả action có trường 'type' (vd: repeat, if, repeatRange, while, forward, collect, ...)
   * - Bao gồm cả block bên trong body/then/else/elseIf và function body
   * - Không tính các đối tượng điều kiện (cond) như variableComparison/and/or là block riêng
   * @param {Object} program - JSON chương trình gốc
   * @returns {number} Tổng số block
   */
  countRawBlocks(program) {
    if (!program || typeof program !== "object") return 0;

    let total = 0;

    // Đếm trong phần định nghĩa hàm nếu có
    if (Array.isArray(program.functions)) {
      for (const func of program.functions) {
        if (Array.isArray(func.body)) {
          total += this.countBlocksInActions(func.body);
        }
      }
    }

    // Đếm trong actions chính
    if (Array.isArray(program.actions)) {
      total += this.countBlocksInActions(program.actions);
    }

    return total;
  }

  /**
   * Đếm block trong mảng actions (raw) đệ quy theo cấu trúc
   * @param {Array} actions
   * @returns {number}
   */
  countBlocksInActions(actions) {
    if (!Array.isArray(actions)) return 0;
    let count = 0;

    for (const action of actions) {
      if (!action || typeof action !== "object") continue;
      if (action.type) {
        count += 1; // Bản thân block hiện tại
      }

      // Mở rộng theo từng loại để duyệt phần thân
      // repeat: body
      if (action.type === "repeat" && Array.isArray(action.body)) {
        count += this.countBlocksInActions(action.body);
      }

      // repeatRange: body
      if (action.type === "repeatRange" && Array.isArray(action.body)) {
        count += this.countBlocksInActions(action.body);
      }

      // if: then, elseIf[].then, else
      if (action.type === "if") {
        if (Array.isArray(action.then)) {
          count += this.countBlocksInActions(action.then);
        }
        if (Array.isArray(action.elseIf)) {
          for (const clause of action.elseIf) {
            if (clause && Array.isArray(clause.then)) {
              count += this.countBlocksInActions(clause.then);
            }
          }
        }
        if (Array.isArray(action.else)) {
          count += this.countBlocksInActions(action.else);
        }
      }

      // while: body
      if (action.type === "while" && Array.isArray(action.body)) {
        count += this.countBlocksInActions(action.body);
      }
    }

    return count;
  }

  /**
   * Parse và validate actions
   * @param {Array} actions - Raw actions from JSON
   * @returns {Array} Parsed actions
   */
  parseActions(actions) {
    const parsedActions = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      // Hỗ trợ lệnh lặp repeat bằng cách phẳng hoá (flatten) thân lệnh vào danh sách actions
      if (action && action.type === "repeat") {
        // Track repeat statement usage
        this.usedStatements.add("repeat");

        const repeatCount = parseInt(action.count) || 1;
        const bodyRaw = Array.isArray(action.body) ? action.body : [];

        // Đệ quy parse phần thân để hỗ trợ repeat lồng nhau
        const parsedBody = this.parseActions(bodyRaw);

        console.log(
          `🔁 Expanding repeat x${repeatCount} with ${parsedBody.length} action(s) in body`
        );

        for (let r = 0; r < repeatCount; r++) {
          for (let j = 0; j < parsedBody.length; j++) {
            // Push bản sao nông là đủ vì các action là immutable objects đơn giản
            parsedActions.push({ ...parsedBody[j] });
          }
        }
        continue;
      }

      // Hỗ trợ lệnh lặp repeat với cú pháp "repeat(i from 1 to 5 by 1)"
      if (action && action.type === "repeatRange") {
        // Track repeatRange statement usage
        this.usedStatements.add("repeatRange");

        const variableName = action.variable || "i";
        const fromValue = parseInt(action.from) || 1;
        const toValue = parseInt(action.to) || 5;
        const stepValue = parseInt(action.step) || 1;
        const bodyRaw = Array.isArray(action.body) ? action.body : [];

        // Đệ quy parse phần thân để hỗ trợ repeat lồng nhau
        const parsedBody = this.parseActions(bodyRaw);

        console.log(
          `🔄 Expanding repeatRange ${variableName} from ${fromValue} to ${toValue} by ${stepValue} with ${parsedBody.length} action(s) in body`
        );

        // Tạo vòng lặp từ fromValue đến toValue với stepValue
        for (
          let currentValue = fromValue;
          currentValue <= toValue;
          currentValue += stepValue
        ) {
          // Tạo bản sao sâu của parsedBody và thay thế biến
          for (let j = 0; j < parsedBody.length; j++) {
            const actionCopy = JSON.parse(JSON.stringify(parsedBody[j]));

            // Thay thế biến trong action nếu có
            this.replaceVariableInAction(
              actionCopy,
              variableName,
              currentValue
            );

            // Thêm thông tin về giá trị biến hiện tại cho việc đánh giá điều kiện
            if (
              actionCopy.type === "if" &&
              actionCopy.condition &&
              actionCopy.condition.type === "variableComparison"
            ) {
              actionCopy._currentVariableValue = {
                [variableName]: currentValue,
              };
            }

            // Debug log để kiểm tra biến đã được thay thế
            if (actionCopy.type === "collect") {
              console.log(
                `🔧 DEBUG: Action copy for i=${currentValue}:`,
                JSON.stringify(actionCopy)
              );
            }

            parsedActions.push(actionCopy);
          }
        }
        continue;
      }

      const parsedAction = this.parseAction(action, i);
      if (parsedAction) {
        parsedActions.push(parsedAction);
      }
    }

    return parsedActions;
  }

  /**
   * Thay thế biến trong action
   * @param {Object} action - Action object
   * @param {string} variableName - Tên biến cần thay thế
   * @param {number} value - Giá trị thay thế
   */
  replaceVariableInAction(action, variableName, value) {
    if (!action || typeof action !== "object") return;

    // Thay thế biến trong tất cả các thuộc tính của action
    for (const key in action) {
      if (action.hasOwnProperty(key)) {
        const propValue = action[key];

        if (typeof propValue === "string") {
          // Thay thế biến trong string (ví dụ: "move {{i}} steps" hoặc "{{i}}")
          const replaced = propValue.replace(
            new RegExp(`{{${variableName}}}`, "g"),
            value
          );

          // Nếu string chỉ chứa biến và số, chuyển thành number
          if (replaced.match(/^\d+$/)) {
            action[key] = parseInt(replaced);
          } else {
            action[key] = replaced;
          }
        } else if (
          typeof propValue === "number" &&
          propValue === variableName
        ) {
          // Thay thế biến nếu giá trị là tên biến
          action[key] = value;
        } else if (typeof propValue === "object" && propValue !== null) {
          // Đệ quy thay thế trong object lồng nhau
          this.replaceVariableInAction(propValue, variableName, value);
        }
      }
    }
  }

  /**
   * Parse một action cụ thể
   * @param {Object} action - Raw action
   * @param {number} index - Action index
   * @returns {Object|null} Parsed action or null if invalid
   */
  parseAction(action, index) {
    if (!action.type) {
      console.warn(`⚠️ Action ${index}: Missing type`);
      return null;
    }

    switch (action.type) {
      case "if": {
        // Giữ nguyên cấu trúc if để đánh giá ở runtime, mở rộng hỗ trợ else-if và else
        const thenActions = Array.isArray(action.then)
          ? this.parseActions(action.then)
          : [];
        const condition = this.parseCondition(action.cond);

        // else-if: mảng các object { cond, then }
        const rawElseIf = Array.isArray(action.elseIf) ? action.elseIf : [];
        const elseIfClauses = rawElseIf
          .map((clause) => {
            if (!clause || typeof clause !== "object") return null;
            const c = this.parseCondition(clause.cond);
            const a = Array.isArray(clause.then)
              ? this.parseActions(clause.then)
              : [];
            return { condition: c, thenActions: a };
          })
          .filter((x) => x !== null);

        // else: danh sách actions
        const elseActions = Array.isArray(action.else)
          ? this.parseActions(action.else)
          : [];

        return {
          type: "if",
          condition,
          thenActions,
          elseIfClauses,
          elseActions,
          original: action,
        };
      }

      case "while": {
        // Giữ nguyên cấu trúc while để đánh giá ở runtime
        const bodyActions = Array.isArray(action.body) ? action.body : [];
        const condition = this.parseCondition(action.cond);
        return {
          type: "while",
          condition,
          bodyActions,
          original: action,
        };
      }

      case "callFunction": {
        // Gọi hàm đã định nghĩa
        return {
          type: "callFunction",
          functionName: action.functionName || action.name,
          original: action,
        };
      }

      case "forward":
        return {
          type: "forward",
          count: parseInt(action.count) || 1,
          original: action,
        };

      case "turnRight":
        return {
          type: "turnRight",
          original: action,
        };

      case "turnLeft":
        return {
          type: "turnLeft",
          original: action,
        };

      case "turnBack":
        return {
          type: "turnBack",
          original: action,
        };

      case "collect":
        return {
          type: "collect",
          count: action.count, // Không parse ngay, để cho replaceVariableInAction xử lý
          colors: action.color ? [action.color] : ["green"],
          original: action,
        };

      case "putBox":
        return {
          type: "putBox",
          count: parseInt(action.count) || 1,
          original: action,
        };

      case "takeBox":
        return {
          type: "takeBox",
          count: parseInt(action.count) || 1,
          original: action,
        };

      default:
        console.warn(`⚠️ Action ${index}: Unknown type "${action.type}"`);
        return null;
    }
  }

  /**
   * Parse đối tượng điều kiện
   * @param {Object} cond - Raw condition
   * @returns {Object|null}
   */
  parseCondition(cond) {
    if (!cond || typeof cond !== "object") return null;

    // Điều kiện so sánh biến: { type: "variableComparison", variable: "i", operator: "==", value: 0 }
    // Hỗ trợ cả biến thường và biến đặc biệt như "batteryCount", "greenCount", "redCount", "yellowCount"
    if (cond.type === "variableComparison") {
      return {
        type: "variableComparison",
        variable: cond.variable || "i",
        operator: cond.operator || "==",
        value: cond.value !== undefined ? cond.value : 0,
        original: cond,
      };
    }

    // Hỗ trợ cả 2 format: functionName và function
    // Điều kiện logic AND: { type: "and", conditions: [cond1, cond2] }
    if (cond.type === "and") {
      return {
        type: "and",
        conditions: Array.isArray(cond.conditions)
          ? cond.conditions
              .map((c) => this.parseCondition(c))
              .filter((c) => c !== null)
          : [],
        original: cond,
      };
    }

    // Điều kiện logic OR: { type: "or", conditions: [cond1, cond2] }
    if (cond.type === "or") {
      return {
        type: "or",
        conditions: Array.isArray(cond.conditions)
          ? cond.conditions
              .map((c) => this.parseCondition(c))
              .filter((c) => c !== null)
          : [],
        original: cond,
      };
    }

    // Điều kiện cũ: { type: "condition", function: "isGreen", check: true }
    return {
      type: cond.type || "condition",
      functionName: cond.functionName || cond.function || null,
      operator: cond.operator || null,
      value: cond.value || null,
      check: typeof cond.check === "boolean" ? cond.check : true,
      original: cond,
    };
  }

  /**
   * Bắt đầu thực thi chương trình
   */
  startProgram() {
    if (!this.program) {
      console.error("❌ No program loaded");
      return false;
    }

    if (this.isRunning) {
      console.warn("⚠️ Program already running");
      return false;
    }

    this.currentStep = 0;
    this.isRunning = true;
    this.isPaused = false;

    console.log(`🚀 Starting program: ${this.program.programName}`);
    this.executeNextCommand();

    return true;
  }

  /**
   * Dừng chương trình
   */
  stopProgram() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentStep = 0;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    console.log("⏹️ Program stopped");
  }

  /**
   * Tạm dừng chương trình
   */
  pauseProgram() {
    if (!this.isRunning) return;

    this.isPaused = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    console.log("⏸️ Program paused");
  }

  /**
   * Tiếp tục chương trình
   */
  resumeProgram() {
    if (!this.isRunning || !this.isPaused) return;

    this.isPaused = false;
    console.log("▶️ Program resumed");
    this.executeNextCommand();
  }

  /**
   * Thực thi lệnh tiếp theo
   */
  executeNextCommand() {
    if (!this.isRunning || this.isPaused) {
      console.log(
        `⏸️ Program paused or stopped. Current step: ${this.currentStep}`
      );
      return;
    }

    if (this.currentStep >= this.program.actions.length) {
      console.log("✅ Program completed!");

      // KIỂM TRA THUA KHI CHƯƠNG TRÌNH KẾT THÚC
      const victoryResult = checkAndDisplayVictory(this.scene);
      if (!victoryResult.isVictory) {
        // Chương trình kết thúc nhưng chưa đủ pin = THUA
        this.scene.lose("Chương trình kết thúc thua cuộc!");
      } else {
        // Gửi thông báo chiến thắng ra webview (không blocking)
        import("./WebViewMessenger.js")
          .then(({ sendVictoryMessage }) => {
            if (typeof sendVictoryMessage === "function") {
              const payload = {};
              if (typeof victoryResult?.starScore === "number") {
                payload.score = victoryResult.starScore;
              }
              sendVictoryMessage(payload);
            }
          })
          .catch((e) => console.warn("Cannot send victory message:", e));
      }

      this.stopProgram();
      return;
    }

    const action = this.program.actions[this.currentStep];
    console.log(
      `🎯 Executing step ${this.currentStep + 1}/${
        this.program.actions.length
      }: ${action.type}${action.count ? ` (count: ${action.count})` : ""}`
    );

    // Thực thi lệnh
    const success = this.executeCommand(action);

    if (success) {
      // Chỉ tăng step và tiếp tục cho các lệnh sync
      // Các lệnh async (như forward) sẽ tự gọi executeNextCommand()
      if (action.type !== "forward") {
        this.currentStep++;
        // Tiếp tục với lệnh tiếp theo sau delay
        this.timer = setTimeout(() => {
          this.executeNextCommand();
        }, this.executionSpeed);
      }
      // Lệnh forward sẽ tự xử lý việc chuyển sang lệnh tiếp theo
    } else {
      console.error(`❌ Command failed at step ${this.currentStep + 1}`);
      this.stopProgram();
    }
  }

  /**
   * Thực thi một lệnh cụ thể
   * @param {Object} action - Action to execute
   * @returns {boolean} Success/failure
   */
  executeCommand(action) {
    try {
      // Track statement usage
      this.usedStatements.add(action.type);

      switch (action.type) {
        case "if":
          return this.executeIf(action);

        case "while":
          return this.executeWhile(action);

        case "callFunction":
          return this.executeCallFunction(action);

        case "forward":
          return this.executeForward(action.count);

        case "turnRight":
          return this.scene.turnRight();

        case "turnLeft":
          return this.scene.turnLeft();

        case "turnBack":
          return this.scene.turnBack();

        case "collect":
          return this.executeCollect(action.count, action.colors);

        case "putBox":
          return this.executePutBox(action.count);

        case "takeBox":
          return this.executeTakeBox(action.count);

        default:
          console.error(`❌ Unknown command: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ Error executing command:`, error);
      return false;
    }
  }

  /**
   * Thực thi câu lệnh if
   * - Nếu điều kiện đúng, chèn thenActions ngay sau bước hiện tại
   */
  executeIf(action) {
    try {
      // Lấy context biến từ action (nếu có)
      const variableContext = action._currentVariableValue || {};

      // Chuỗi nhánh: IF → (ELSE-IF)* → ELSE
      const branches = [];

      // Nhánh IF đầu tiên
      branches.push({
        condition: action.condition,
        actions: Array.isArray(action.thenActions) ? action.thenActions : [],
        label: "IF",
      });

      // Các nhánh ELSE-IF nếu có
      const elseIfs = Array.isArray(action.elseIfClauses)
        ? action.elseIfClauses
        : [];
      elseIfs.forEach((cl, idx) => {
        branches.push({
          condition: cl?.condition || null,
          actions: Array.isArray(cl?.thenActions) ? cl.thenActions : [],
          label: `ELSE-IF#${idx + 1}`,
        });
      });

      // ELSE actions nếu có
      const elseActions = Array.isArray(action.elseActions)
        ? action.elseActions
        : [];

      // Tìm nhánh phù hợp đầu tiên
      let selectedActions = null;
      for (const br of branches) {
        const ok = this.evaluateCondition(br.condition, variableContext);
        console.log(
          `🤔 ${br.label} condition (${
            br.condition?.functionName || br.condition?.type
          }) => ${ok}`
        );
        if (ok) {
          selectedActions = br.actions;
          break;
        }
      }

      // Nếu không có nhánh nào khớp, dùng ELSE
      if (!selectedActions || selectedActions.length === 0) {
        if (elseActions.length > 0) {
          selectedActions = elseActions;
          console.log(
            `🧩 Using ELSE branch with ${elseActions.length} action(s)`
          );
        }
      }

      if (Array.isArray(selectedActions) && selectedActions.length > 0) {
        const insertIndex = this.currentStep + 1;
        this.program.actions.splice(
          insertIndex,
          0,
          ...selectedActions.map((a) => ({ ...a }))
        );
        console.log(
          `🧩 Inserted ${selectedActions.length} action(s) at ${insertIndex}`
        );
      }
      return true;
    } catch (e) {
      console.error("❌ Failed to execute IF:", e);
      return false;
    }
  }

  /**
   * Thực thi câu lệnh while
   * - Nếu điều kiện đúng, chèn bodyActions và tái chèn while để lặp lại
   */
  executeWhile(action) {
    try {
      const result = this.evaluateCondition(action.condition);
      console.log(
        `🔄 WHILE condition (${action.condition?.functionName}) => ${result}`
      );

      if (
        result &&
        Array.isArray(action.bodyActions) &&
        action.bodyActions.length > 0
      ) {
        // Chèn bodyActions và tái chèn while để lặp lại
        const insertIndex = this.currentStep + 1;
        const whileAction = { ...action }; // Tạo bản sao của while action
        this.program.actions.splice(
          insertIndex,
          0,
          ...action.bodyActions.map((a) => ({ ...a })),
          whileAction
        );
        console.log(
          `🔄 Inserted ${action.bodyActions.length} body action(s) + while loop at ${insertIndex}`
        );
      }
      return true;
    } catch (e) {
      console.error("❌ Failed to execute WHILE:", e);
      return false;
    }
  }

  /**
   * Thực thi gọi hàm
   * - Chèn các action của hàm vào vị trí hiện tại
   */
  executeCallFunction(action) {
    try {
      const functionName = action.functionName;
      const func = this.functions.get(functionName);

      if (!func) {
        console.error(`❌ Function '${functionName}' not found`);
        return false;
      }

      console.log(`🔧 Calling function: ${functionName}`);

      if (Array.isArray(func.actions) && func.actions.length > 0) {
        // Chèn các action của hàm vào vị trí hiện tại
        const insertIndex = this.currentStep + 1;
        this.program.actions.splice(
          insertIndex,
          0,
          ...func.actions.map((a) => ({ ...a }))
        );
        console.log(
          `🔧 Inserted ${func.actions.length} action(s) from function '${functionName}' at ${insertIndex}`
        );
      }
      return true;
    } catch (e) {
      console.error("❌ Failed to execute function call:", e);
      return false;
    }
  }

  /**
   * Đánh giá điều kiện
   * Hỗ trợ: condition.function = "isGreen" => có pin xanh tại ô hiện tại?
   * Hỗ trợ: variableComparison => so sánh biến với giá trị (bao gồm biến đặc biệt)
   * Hỗ trợ: and/or => điều kiện logic
   * Nếu cond.check = false thì đảo ngược kết quả
   */
  evaluateCondition(cond, variableContext = {}) {
    if (!cond) return false;

    // Điều kiện so sánh biến (bao gồm biến đặc biệt)
    if (cond.type === "variableComparison") {
      let variableValue = variableContext[cond.variable];

      // Nếu không tìm thấy trong context, kiểm tra biến đặc biệt
      if (variableValue === undefined) {
        variableValue = this.getSpecialVariableValue(cond.variable);
      }

      if (variableValue === undefined) {
        console.warn(
          `⚠️ Variable "${cond.variable}" not found in context or special variables`
        );
        return false;
      }

      const result = this.compareValues(
        variableValue,
        cond.operator,
        cond.value
      );
      console.log(
        `🔍 Variable comparison: ${cond.variable}(${variableValue}) ${cond.operator} ${cond.value} => ${result}`
      );
      return result;
    }

    // Điều kiện logic AND
    if (cond.type === "and") {
      if (!Array.isArray(cond.conditions) || cond.conditions.length === 0) {
        return false;
      }

      const results = cond.conditions.map((c) =>
        this.evaluateCondition(c, variableContext)
      );
      const result = results.every((r) => r === true);
      console.log(`🔗 AND condition: [${results.join(", ")}] => ${result}`);
      return result;
    }

    // Điều kiện logic OR
    if (cond.type === "or") {
      if (!Array.isArray(cond.conditions) || cond.conditions.length === 0) {
        return false;
      }

      const results = cond.conditions.map((c) =>
        this.evaluateCondition(c, variableContext)
      );
      const result = results.some((r) => r === true);
      console.log(`🔗 OR condition: [${results.join(", ")}] => ${result}`);
      return result;
    }

    // Điều kiện cũ (sensor-based)
    let actual = false;
    const functionName = cond.functionName || cond.function;
    switch (functionName) {
      case "isGreen":
        actual = this.hasBatteryColorAtCurrentTile("green");
        break;
      case "warehouseCount":
        // Number box block - gọi checkWarehouse() và so sánh với giá trị
        const warehouseCount = this.scene.boxManager.checkWarehouse();
        const operator = cond.operator || "==";
        const compareValue = parseInt(cond.value) || 0;
        actual = this.compareValues(warehouseCount, operator, compareValue);
        break;
      case "isRed":
        actual = this.hasBatteryColorAtCurrentTile("red");
        break;
      case "isYellow":
        actual = this.hasBatteryColorAtCurrentTile("yellow");
        break;
      default:
        console.warn(`⚠️ Unknown condition function: ${functionName}`);
        actual = false;
    }
    return cond.check ? actual : !actual;
  }

  /**
   * So sánh hai giá trị với toán tử
   * @param {*} leftValue - Giá trị bên trái
   * @param {string} operator - Toán tử (==, !=, <, >, <=, >=)
   * @param {*} rightValue - Giá trị bên phải
   * @returns {boolean}
   */
  compareValues(leftValue, operator, rightValue) {
    switch (operator) {
      case "==":
        return leftValue == rightValue;
      case "!=":
        return leftValue != rightValue;
      case "<":
        return leftValue < rightValue;
      case ">":
        return leftValue > rightValue;
      case "<=":
        return leftValue <= rightValue;
      case ">=":
        return leftValue >= rightValue;
      default:
        console.warn(`⚠️ Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Kiểm tra có pin màu chỉ định tại ô hiện tại không
   */
  hasBatteryColorAtCurrentTile(color) {
    const info = this.scene.getBatteriesAtCurrentTile();
    if (!info) return false;
    const count = info?.count || 0;
    if (count <= 0) return false;
    const types = Array.isArray(info?.types) ? info.types : [];
    return types.some((t) => t === color);
  }

  /**
   * Lấy số lượng pin tại vị trí hiện tại
   * @returns {number} Số lượng pin
   */
  getNumberBattery() {
    const info = this.scene.getBatteriesAtCurrentTile();
    if (!info) return 0;
    return info?.count || 0;
  }

  /**
   * Lấy giá trị của biến đặc biệt
   * @param {string} variableName - Tên biến đặc biệt
   * @returns {number|undefined} Giá trị biến hoặc undefined nếu không tìm thấy
   */
  getSpecialVariableValue(variableName) {
    const info = this.scene.getBatteriesAtCurrentTile();
    if (!info) return undefined;

    switch (variableName) {
      case "batteryCount":
        return info?.count || 0;

      case "greenCount":
        return this.getBatteryCountByColor("green");

      case "redCount":
        return this.getBatteryCountByColor("red");

      case "yellowCount":
        return this.getBatteryCountByColor("yellow");

      default:
        return undefined;
    }
  }

  /**
   * Đếm số lượng pin theo màu tại vị trí hiện tại
   * @param {string} color - Màu pin cần đếm
   * @returns {number} Số lượng pin theo màu
   */
  getBatteryCountByColor(color) {
    const info = this.scene.getBatteriesAtCurrentTile();
    if (!info || !Array.isArray(info.types)) return 0;

    return info.types.filter((type) => type === color).length;
  }

  /**
   * Thực thi lệnh forward với count
   * @param {number} count - Số bước đi
   * @returns {boolean} Success/failure
   */
  executeForward(count) {
    console.log(`🚶 Moving forward ${count} step(s)`);

    // Thực hiện từng bước một cách tuần tự
    this.executeForwardStep(count, 0);
    return true; // Không gọi executeNextCommand() ở đây, để executeForwardStep xử lý
  }

  /**
   * Thực thi một bước forward
   * @param {number} totalCount - Tổng số bước
   * @param {number} currentStep - Bước hiện tại
   */
  executeForwardStep(totalCount, currentStep) {
    if (currentStep >= totalCount) {
      // Hoàn thành tất cả bước, tăng step và tiếp tục với lệnh tiếp theo
      this.currentStep++;
      this.executeNextCommand();
      return;
    }

    const success = this.scene.moveForward();
    if (!success) {
      console.error(
        `❌ Failed to move forward at step ${currentStep + 1}/${totalCount}`
      );
      this.stopProgram();
      return;
    }

    // Chờ animation hoàn thành rồi thực hiện bước tiếp theo
    setTimeout(() => {
      this.executeForwardStep(totalCount, currentStep + 1);
    }, 400); // Chờ animation hoàn thành
  }

  /**
   * Thực thi lệnh collect với count và colors
   * @param {number} count - Số lần collect
   * @param {Array} colors - Màu sắc battery
   * @returns {boolean} Success/failure
   */
  executeCollect(count, colors) {
    // Parse count nếu là string
    const parsedCount =
      typeof count === "string" ? parseInt(count) || 1 : count || 1;
    console.log(
      `🔋 Collecting ${parsedCount} battery(ies) with colors:`,
      colors
    );

    // Pre-check: đủ số lượng theo màu yêu cầu?
    const {
      key,
      sprites,
      types,
      count: perTileCount,
    } = this.scene.getBatteriesAtCurrentTile();
    if (perTileCount === 0) {
      this.scene.lose("Không có pin tại ô hiện tại");
      return false;
    }

    console.log(
      `🔍 Collect pre-check at tile ${key}: available=${perTileCount}, requested=${parsedCount}`
    );

    // Quy tắc: số lượng phải khớp CHÍNH XÁC với số pin trong ô
    if (perTileCount !== parsedCount) {
      this.scene.lose(
        `Có ${perTileCount} pin tại ô, nhưng yêu cầu thu thập ${parsedCount} (phải khớp chính xác)`
      );
      return false;
    }

    // Chuẩn hóa colors
    const normalizedColors =
      Array.isArray(colors) && colors.length > 0 ? colors : ["green"];

    // Đếm theo màu hiện có
    const available = { red: 0, yellow: 0, green: 0 };
    types.forEach((t) => (available[t] = (available[t] || 0) + 1));

    // Kiểm tra theo màu yêu cầu nếu có
    let requiredByColor = { red: 0, yellow: 0, green: 0 };
    for (let i = 0; i < parsedCount; i++) {
      const c =
        normalizedColors[i] ||
        normalizedColors[normalizedColors.length - 1] ||
        "green";
      requiredByColor[c] = (requiredByColor[c] || 0) + 1;
    }
    for (const c of Object.keys(requiredByColor)) {
      if ((available[c] || 0) < requiredByColor[c]) {
        this.scene.lose(
          `Không đủ pin màu ${c}. Cần ${requiredByColor[c]}, có ${
            available[c] || 0
          }`
        );
        return false;
      }
    }

    // Thực hiện nhặt
    for (let i = 0; i < parsedCount; i++) {
      const color =
        normalizedColors[i] ||
        normalizedColors[normalizedColors.length - 1] ||
        "green";
      console.log(`   Collecting ${color} battery (${i + 1}/${parsedCount})`);
      const ok = this.scene.collectBattery(color);
      if (!ok) return false;
    }

    return true;
  }

  /**
   * Thực thi lệnh putBox
   * @param {number} count - Số lượng box cần đặt
   * @returns {boolean} Success/failure
   */
  executePutBox(count) {
    console.log(`📦 Putting ${count} box(es)`);

    try {
      const success = this.scene.putBox(count);
      if (!success) {
        console.error(`❌ Failed to put ${count} box(es)`);
        if (this.scene && typeof this.scene.lose === "function") {
          this.scene.lose(
            `Không thể đặt ${count} hộp (vượt quá số đang mang hoặc ô trước mặt không hợp lệ).`
          );
        }
        return false;
      }

      console.log(`✅ Successfully put ${count} box(es)`);
      return true;
    } catch (error) {
      console.error(`❌ Error putting boxes:`, error);
      return false;
    }
  }

  /**
   * Thực thi lệnh takeBox
   * @param {number} count - Số lượng box cần lấy
   * @returns {boolean} Success/failure
   */
  executeTakeBox(count) {
    console.log(`📦 Taking ${count} box(es)`);

    try {
      const success = this.scene.takeBox(count);
      if (!success) {
        console.error(`❌ Failed to take ${count} box(es)`);
        if (this.scene && typeof this.scene.lose === "function") {
          this.scene.lose(
            `Không thể lấy ${count} hộp (không đủ hộp tại ô trước mặt).`
          );
        }
        return false;
      }

      console.log(`✅ Successfully took ${count} box(es)`);
      return true;
    } catch (error) {
      console.error(`❌ Error taking boxes:`, error);
      return false;
    }
  }

  /**
   * Thực thi lệnh checkWarehouse
   * @returns {number} Số lượng box còn lại tại warehouse
   */
  executeCheckWarehouse() {
    console.log(`🏭 Checking warehouse...`);

    try {
      const remainingBoxes = this.scene.boxManager.checkWarehouse();
      console.log(`🏭 Warehouse has ${remainingBoxes} boxes remaining`);
      return remainingBoxes;
    } catch (error) {
      console.error(`❌ Error checking warehouse:`, error);
      return 0;
    }
  }

  /**
   * Lấy trạng thái hiện tại
   * @returns {Object} Current state
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentStep: this.currentStep,
      totalSteps: this.program ? this.program.actions.length : 0,
      programName: this.program ? this.program.programName : null,
    };
  }
}
