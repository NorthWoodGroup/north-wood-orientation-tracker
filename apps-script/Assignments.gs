/**
 * Assignment lifecycle: creation (role defaults + individual overrides),
 * status transitions, quiz validation, and the daily overdue sweep.
 */

var STATUS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue'
};

function moduleRoleList_(module) {
  return String(module.DefaultForRoles || '')
    .split(',')
    .map(function (r) { return r.trim(); })
    .filter(function (r) { return r.length > 0; });
}

/** Assigns every role-default module for `role` to `staffId` that isn't already assigned. */
function applyRoleDefaults(staffId, role) {
  var modules = getRows('Modules');
  var existing = getRows('Assignments').filter(function (a) { return a.StaffID === staffId; });
  var existingModuleIds = existing.map(function (a) { return a.ModuleID; });

  modules.forEach(function (m) {
    if (moduleRoleList_(m).indexOf(role) === -1) return;
    if (existingModuleIds.indexOf(m.ModuleID) !== -1) return;
    assignModule_(staffId, m.ModuleID, 'role default');
  });
}

/** Admin action: assign one module to one staff member as an individual override. */
function addIndividualAssignment(staffId, moduleId) {
  var already = getRows('Assignments').some(function (a) {
    return a.StaffID === staffId && a.ModuleID === moduleId;
  });
  if (already) throw new Error('That module is already assigned to this staff member.');
  assignModule_(staffId, moduleId, 'individual override');
}

function assignModule_(staffId, moduleId, source) {
  var module = findRow('Modules', 'ModuleID', moduleId);
  if (!module) throw new Error('Module not found: ' + moduleId);
  var assignedDate = todayISO_();
  var dueDate = addDaysISO_(assignedDate, module.DaysToComplete || 0);

  appendRow('Assignments', {
    AssignmentID: nextId('Assignments', 'AssignmentID', 'ASG'),
    StaffID: staffId,
    ModuleID: moduleId,
    AssignedDate: assignedDate,
    DueDate: dueDate,
    Status: STATUS.NOT_STARTED,
    CompletedDate: '',
    Source: source
  });

  var staff = findRow('Staff', 'StaffID', staffId);
  if (staff) notifyStaffAssigned(staff, module, dueDate);
}

/** Admin action: remove an assignment outright (role-default or override). */
function removeAssignment(assignmentId) {
  var row = findRow('Assignments', 'AssignmentID', assignmentId);
  if (!row) throw new Error('Assignment not found: ' + assignmentId);
  deleteRowByIndex('Assignments', row._row);
}

function findAssignment_(staffId, moduleId) {
  return getRows('Assignments').filter(function (a) {
    return a.StaffID === staffId && a.ModuleID === moduleId;
  })[0] || null;
}

/** Staff action: called when a module is first opened. Not Started -> In Progress. */
function markModuleOpened(staffId, moduleId) {
  var a = findAssignment_(staffId, moduleId);
  if (!a) throw new Error('Assignment not found for this staff/module.');
  if (a.Status === STATUS.NOT_STARTED) {
    updateRowByIndex('Assignments', a._row, { Status: STATUS.IN_PROGRESS });
  }
}

/** Staff action: checkbox or scroll-unlock completion (no quiz to validate). */
function markModuleComplete(staffId, moduleId) {
  var module = findRow('Modules', 'ModuleID', moduleId);
  if (module && module.CompletionMethod === 'quiz') {
    throw new Error('This module requires the quiz — use submitQuizAnswers instead.');
  }
  completeAssignment_(staffId, moduleId);
}

/** Staff action: submit quiz answers. Requires every answer correct to complete the module. */
function submitQuizAnswers(staffId, moduleId, answers) {
  var questions = getRows('Quizzes').filter(function (q) { return q.ModuleID === moduleId; });
  if (questions.length === 0) throw new Error('No quiz configured for this module.');

  var correctCount = 0;
  questions.forEach(function (q) {
    var given = answers[q.QuestionID];
    if (given && String(given).trim().toUpperCase() === String(q.CorrectChoice).trim().toUpperCase()) {
      correctCount++;
    }
  });

  var passed = correctCount === questions.length;
  if (passed) completeAssignment_(staffId, moduleId);

  return { passed: passed, correctCount: correctCount, totalQuestions: questions.length };
}

function completeAssignment_(staffId, moduleId) {
  var a = findAssignment_(staffId, moduleId);
  if (!a) throw new Error('Assignment not found for this staff/module.');
  updateRowByIndex('Assignments', a._row, {
    Status: STATUS.COMPLETED,
    CompletedDate: todayISO_()
  });
}

/** Quiz questions for a module, with correct answers stripped out (staff-facing). */
function getQuizQuestions(moduleId) {
  return getRows('Quizzes')
    .filter(function (q) { return q.ModuleID === moduleId; })
    .map(function (q) {
      return {
        QuestionID: q.QuestionID,
        QuestionText: q.QuestionText,
        ChoiceA: q.ChoiceA,
        ChoiceB: q.ChoiceB,
        ChoiceC: q.ChoiceC,
        ChoiceD: q.ChoiceD
      };
    });
}

/** Staff dashboard: this staff member's assignments joined with module info. */
function getStaffDashboard(staffId) {
  var modules = getRows('Modules');
  var moduleById = {};
  modules.forEach(function (m) { moduleById[m.ModuleID] = m; });

  var today = todayISO_();
  return getRows('Assignments')
    .filter(function (a) { return a.StaffID === staffId; })
    .map(function (a) {
      var m = moduleById[a.ModuleID] || {};
      var displayStatus = a.Status;
      if (displayStatus !== STATUS.COMPLETED && a.DueDate && a.DueDate < today) {
        displayStatus = STATUS.OVERDUE;
      }
      return {
        AssignmentID: a.AssignmentID,
        ModuleID: a.ModuleID,
        Title: m.Title,
        Description: m.Description,
        Category: m.Category,
        FileType: m.FileType,
        FilePathOrURL: m.FilePathOrURL,
        CompletionMethod: m.CompletionMethod,
        AssignedDate: a.AssignedDate,
        DueDate: a.DueDate,
        Status: displayStatus,
        CompletedDate: a.CompletedDate
      };
    });
}

/** Admin dashboard: every staff member x every assigned module, with status. */
function getAdminDashboard() {
  var staffById = {};
  getRows('Staff').forEach(function (s) { staffById[s.StaffID] = s; });
  var moduleById = {};
  getRows('Modules').forEach(function (m) { moduleById[m.ModuleID] = m; });

  var today = todayISO_();
  return getRows('Assignments').map(function (a) {
    var s = staffById[a.StaffID] || {};
    var m = moduleById[a.ModuleID] || {};
    var displayStatus = a.Status;
    if (displayStatus !== STATUS.COMPLETED && a.DueDate && a.DueDate < today) {
      displayStatus = STATUS.OVERDUE;
    }
    return {
      AssignmentID: a.AssignmentID,
      StaffID: a.StaffID,
      StaffName: s.Name,
      Office: s.Office,
      Role: s.Role,
      ModuleID: a.ModuleID,
      ModuleTitle: m.Title,
      Category: m.Category,
      AssignedDate: a.AssignedDate,
      DueDate: a.DueDate,
      Status: displayStatus,
      CompletedDate: a.CompletedDate,
      Source: a.Source
    };
  });
}

/**
 * Daily trigger (installed by Setup.gs). Flips Not Started/In Progress
 * assignments past DueDate to Overdue and emails admins a summary of newly
 * overdue items. Only emails about items that just crossed the line this
 * run, so admins aren't re-notified every day about the same overdue item.
 */
function checkOverdueAssignments() {
  var today = todayISO_();
  var staffById = {};
  getRows('Staff').forEach(function (s) { staffById[s.StaffID] = s; });
  var moduleById = {};
  getRows('Modules').forEach(function (m) { moduleById[m.ModuleID] = m; });

  var newlyOverdue = [];
  getRows('Assignments').forEach(function (a) {
    var isOpen = a.Status === STATUS.NOT_STARTED || a.Status === STATUS.IN_PROGRESS;
    if (isOpen && a.DueDate && a.DueDate < today) {
      updateRowByIndex('Assignments', a._row, { Status: STATUS.OVERDUE });
      newlyOverdue.push({
        staff: staffById[a.StaffID],
        module: moduleById[a.ModuleID],
        dueDate: a.DueDate
      });
    }
  });

  if (newlyOverdue.length > 0) notifyAdminsOverdue(newlyOverdue);
}
