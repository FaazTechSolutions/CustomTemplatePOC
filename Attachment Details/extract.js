const fs = require('fs');
const path = require('path');

const srcDir = 'd:\\BasithFts\\Mawarid Frontend\\Custom Template';
const destDir = path.join(srcDir, 'Angular Implementation');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir);
}

// 1. Process app.js
let appJs = fs.readFileSync(path.join(srcDir, 'app.js'), 'utf8');

appJs = appJs.replace(
    /TOKEN:\s*'.*?',/,
    "TOKEN:       '{{Local.eyjJwhtbtGockieOniJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9}}',"
);

appJs = appJs.replace(
    /COMPANY_ID:\s*'.*?',/,
    "COMPANY_ID:  '{{Local.CompanyId}}',"
);

appJs = appJs.replace(
    /REF_REC_ID:\s*\(\(\) => \{[\s\S]*?\}\)\(\),/,
    "REF_REC_ID:  '{{Query.RecId}}',"
);

appJs = appJs.replace(
    /ENDPOINT:\s*'.*?LGE0000001(.*?)',/,
    "ENDPOINT:       'https://portal.mawarid.com.sa/apps4x-api/api/v1/metaobject/{{Local.CompanyId}}$1',"
);

appJs = appJs.replace(
    /UPLOAD_BASE:\s*'.*?LGE0000001(.*?)',/,
    "UPLOAD_BASE:    'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/{{Local.CompanyId}}$1',"
);

appJs = appJs.replace(
    /FILES_BASE:\s*'.*?LGE0000001(.*?)',/,
    "FILES_BASE:     'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/{{Local.CompanyId}}$1',"
);

appJs = appJs.replace(
    /DOWNLOAD_BASE:\s*'.*?LGE0000001(.*?)',/,
    "DOWNLOAD_BASE:  'https://portal.mawarid.com.sa/apps4x-api/api/v1/attachment/{{Local.CompanyId}}$1',"
);

fs.writeFileSync(path.join(destDir, 'template.js'), appJs);

// 2. Process index.html
let indexHtml = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const match = indexHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (match) {
    let bodyContent = match[1];
    // Remove the script tag for app.js
    bodyContent = bodyContent.replace(/<script src="app\.js"><\/script>/i, '');
    // Trim spaces
    bodyContent = bodyContent.trim();
    fs.writeFileSync(path.join(destDir, 'template.html'), bodyContent);
}

// 3. Process styles.css
let stylesCss = fs.readFileSync(path.join(srcDir, 'styles.css'), 'utf8');
fs.writeFileSync(path.join(destDir, 'template.css'), stylesCss);

console.log('Extraction completed successfully!');
