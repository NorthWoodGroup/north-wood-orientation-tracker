/**
 * Staff / module / admin library management — CRUD used by the admin app.
 * Assignment-specific operations live in Assignments.gs.
 */

// ---- Staff ----

function listStaff() {
  return getRows('Staff').map(stripAuthFields_);
}

function addStaff(staff, initialPin) {
  var id = nextId('Staff', 'StaffID', 'STF');
  var salt = makeSalt_();
  appendRow('Staff', {
    StaffID: id,
    Name: staff.Name,
    Username: staff.Username,
    Email: staff.Email || '',
    PINSalt: salt,
    PINHash: hashPin_(initialPin, salt),
    Role: staff.Role,
    Office: staff.Office || '',
    Active: true
  });
  applyRoleDefaults(id, staff.Role);
  return id;
}

function updateStaff(staffId, updates) {
  var row = findRow('Staff', 'StaffID', staffId);
  if (!row) throw new Error('Staff not found: ' + staffId);
  var safeUpdates = {};
  ['Name', 'Username', 'Email', 'Role', 'Office', 'Active'].forEach(function (k) {
    if (updates.hasOwnProperty(k)) safeUpdates[k] = updates[k];
  });
  updateRowByIndex('Staff', row._row, safeUpdates);
}

function setStaffActive(staffId, active) {
  updateStaff(staffId, { Active: active });
}

// ---- Modules ----

function listModules() {
  return getRows('Modules');
}

function addModule(module) {
  var id = nextId('Modules', 'ModuleID', 'MOD');
  appendRow('Modules', {
    ModuleID: id,
    Title: module.Title,
    Description: module.Description || '',
    Category: module.Category || '',
    FileType: module.FileType,
    FilePathOrURL: module.FilePathOrURL,
    CompletionMethod: module.CompletionMethod,
    DaysToComplete: module.DaysToComplete,
    DefaultForRoles: module.DefaultForRoles || ''
  });
  return id;
}

function updateModule(moduleId, updates) {
  var row = findRow('Modules', 'ModuleID', moduleId);
  if (!row) throw new Error('Module not found: ' + moduleId);
  var safeUpdates = {};
  ['Title', 'Description', 'Category', 'FileType', 'FilePathOrURL', 'CompletionMethod', 'DaysToComplete', 'DefaultForRoles'].forEach(function (k) {
    if (updates.hasOwnProperty(k)) safeUpdates[k] = updates[k];
  });
  updateRowByIndex('Modules', row._row, safeUpdates);
}

function deleteModule(moduleId) {
  var row = findRow('Modules', 'ModuleID', moduleId);
  if (!row) throw new Error('Module not found: ' + moduleId);
  deleteRowByIndex('Modules', row._row);
}

/** Replaces all quiz questions for a module with the given list. */
function saveQuizQuestions(moduleId, questions) {
  var sheet = getSheet_('Quizzes');
  var existing = getRows('Quizzes').filter(function (q) { return q.ModuleID === moduleId; });
  // delete existing rows for this module, bottom-up so indices stay valid
  existing.sort(function (a, b) { return b._row - a._row; }).forEach(function (q) {
    sheet.deleteRow(q._row);
  });
  questions.forEach(function (q, i) {
    appendRow('Quizzes', {
      ModuleID: moduleId,
      QuestionID: 'Q' + (i + 1),
      QuestionText: q.QuestionText,
      ChoiceA: q.ChoiceA,
      ChoiceB: q.ChoiceB,
      ChoiceC: q.ChoiceC,
      ChoiceD: q.ChoiceD,
      CorrectChoice: q.CorrectChoice
    });
  });
}

function listQuizQuestionsForAdmin(moduleId) {
  return getRows('Quizzes').filter(function (q) { return q.ModuleID === moduleId; });
}

// ---- Admins ----

function listAdmins() {
  return getRows('Admins').map(stripAuthFields_);
}

function addAdmin(admin, initialPin) {
  var id = nextId('Admins', 'AdminID', 'ADM');
  var salt = makeSalt_();
  appendRow('Admins', {
    AdminID: id,
    Name: admin.Name,
    Username: admin.Username,
    Email: admin.Email || '',
    PINSalt: salt,
    PINHash: hashPin_(initialPin, salt)
  });
  return id;
}
