/**
 * MailApp notifications: new-assignment emails to staff, overdue-alert
 * summaries to admins. Fails soft — a missing/blank Email column shouldn't
 * block the assignment or the overdue sweep from completing.
 */

function notifyStaffAssigned(staff, module, dueDate) {
  if (!staff || !staff.Email) return;
  try {
    MailApp.sendEmail({
      to: staff.Email,
      subject: 'New training module assigned: ' + module.Title,
      body: 'Hi ' + staff.Name + ',\n\n' +
        'You have been assigned a new training module:\n\n' +
        '  ' + module.Title + '\n' +
        '  Due: ' + dueDate + '\n\n' +
        'Sign in to the North Wood Group staff orientation app to view it.\n'
    });
  } catch (e) {
    Logger.log('notifyStaffAssigned failed for ' + staff.Email + ': ' + e);
  }
}

function notifyAdminsOverdue(overdueItems) {
  var adminEmails = getRows('Admins')
    .map(function (a) { return a.Email; })
    .filter(function (e) { return e; });
  if (adminEmails.length === 0) return;

  var lines = overdueItems.map(function (item) {
    var staffName = item.staff ? item.staff.Name : 'Unknown staff';
    var moduleTitle = item.module ? item.module.Title : 'Unknown module';
    return '  ' + staffName + ' — ' + moduleTitle + ' (was due ' + item.dueDate + ')';
  });

  try {
    MailApp.sendEmail({
      to: adminEmails.join(','),
      subject: overdueItems.length + ' training module(s) went overdue',
      body: 'The following assignments passed their due date without being completed:\n\n' +
        lines.join('\n') +
        '\n\nView the completion dashboard in the admin app for full details.\n'
    });
  } catch (e) {
    Logger.log('notifyAdminsOverdue failed: ' + e);
  }
}
