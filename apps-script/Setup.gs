/**
 * One-time Sheet provisioner. Bind this script to a blank Google Sheet, then
 * run setup() once from the Apps Script editor (Run > setup). Safe to re-run —
 * it skips any tab that already exists rather than overwriting it.
 */

var SHEET_SCHEMAS = {
  Staff: ['StaffID', 'Name', 'Username', 'Email', 'PINSalt', 'PINHash', 'Role', 'Office', 'Active'],
  Admins: ['AdminID', 'Name', 'Username', 'Email', 'PINSalt', 'PINHash'],
  Modules: ['ModuleID', 'Title', 'Description', 'Category', 'FileType', 'FilePathOrURL', 'CompletionMethod', 'DaysToComplete', 'DefaultForRoles'],
  Quizzes: ['ModuleID', 'QuestionID', 'QuestionText', 'ChoiceA', 'ChoiceB', 'ChoiceC', 'ChoiceD', 'CorrectChoice'],
  Assignments: ['AssignmentID', 'StaffID', 'ModuleID', 'AssignedDate', 'DueDate', 'Status', 'CompletedDate', 'Source']
};

function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(SHEET_SCHEMAS).forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      Logger.log('Skipping existing sheet: ' + name);
      return;
    }
    sheet = ss.insertSheet(name);
    var headers = SHEET_SCHEMAS[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
    Logger.log('Created sheet: ' + name);
  });

  // Remove the default blank "Sheet1" if it's still sitting there empty.
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  installDailyOverdueTrigger();
  Logger.log('Setup complete.');
}

/** Installs the daily overdue-check trigger if it isn't already installed. Safe to re-run. */
function installDailyOverdueTrigger() {
  var already = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'checkOverdueAssignments';
  });
  if (already) return;
  ScriptApp.newTrigger('checkOverdueAssignments')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
}
