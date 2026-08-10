/**
 * Web app entry point. doPost-only JSON API — deploy as "Execute as: Me",
 * "Who has access: Anyone". The frontends POST {action, payload} with
 * Content-Type: text/plain;charset=utf-8 (not application/json) so the
 * request stays a CORS "simple request" and skips a preflight OPTIONS call,
 * which Apps Script web apps can't answer with custom CORS headers anyway.
 *
 * Every action handler below is a plain function name — add a new action by
 * adding a case here and a function in the relevant file (Assignments.gs,
 * Admin.gs, Auth.gs, GitHubService.gs).
 */

function doPost(e) {
  var response;
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var payload = body.payload || {};
    var data = routeAction_(action, payload);
    response = { ok: true, data: data };
  } catch (err) {
    response = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function routeAction_(action, p) {
  switch (action) {
    // --- Auth ---
    case 'staffLogin': return authenticateStaff(p.username, p.pin);
    case 'adminLogin': return authenticateAdmin(p.username, p.pin);
    case 'setStaffPin': return setStaffPin(p.staffId, p.newPin);
    case 'setAdminPin': return setAdminPin(p.adminId, p.newPin);

    // --- Staff-facing ---
    case 'getStaffDashboard': return getStaffDashboard(p.staffId);
    case 'markModuleOpened': return markModuleOpened(p.staffId, p.moduleId);
    case 'markModuleComplete': return markModuleComplete(p.staffId, p.moduleId);
    case 'getQuizQuestions': return getQuizQuestions(p.moduleId);
    case 'submitQuizAnswers': return submitQuizAnswers(p.staffId, p.moduleId, p.answers);

    // --- Admin: staff ---
    case 'listStaff': return listStaff();
    case 'addStaff': return addStaff(p.staff, p.initialPin);
    case 'updateStaff': return updateStaff(p.staffId, p.updates);
    case 'setStaffActive': return setStaffActive(p.staffId, p.active);

    // --- Admin: modules ---
    case 'listModules': return listModules();
    case 'addModule': return addModule(p.module);
    case 'updateModule': return updateModule(p.moduleId, p.updates);
    case 'deleteModule': return deleteModule(p.moduleId);
    case 'saveQuizQuestions': return saveQuizQuestions(p.moduleId, p.questions);
    case 'listQuizQuestionsForAdmin': return listQuizQuestionsForAdmin(p.moduleId);

    // --- Admin: assignments ---
    case 'applyRoleDefaults': return applyRoleDefaults(p.staffId, p.role);
    case 'addIndividualAssignment': return addIndividualAssignment(p.staffId, p.moduleId);
    case 'removeAssignment': return removeAssignment(p.assignmentId);
    case 'getAdminDashboard': return getAdminDashboard();

    // --- Admin: admins ---
    case 'listAdmins': return listAdmins();
    case 'addAdmin': return addAdmin(p.admin, p.initialPin);

    // --- Admin: content upload ---
    case 'uploadMaterial': return commitFileToGitHub(p.repoPath, p.base64Content, p.commitMessage);

    default: throw new Error('Unknown action: ' + action);
  }
}
