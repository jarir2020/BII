<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Dompdf\Dompdf;
use Dompdf\Options;
use Throwable;
use Yii;
use yii\web\Response;

/**
 * /api/certificate/pdf — generate the project-completion certificate as a PDF.
 *
 * POST body (JSON):
 *   client_signature     (string) data URL or raw base64 of the client's signature image
 *   developer_signature  (string) data URL or raw base64 of the developer's signature image
 *   client_name          (string, optional)
 *   developer_name       (string, optional)
 *   date                 (string, optional, YYYY-MM-DD)
 *
 * Returns application/pdf as an attachment download. Public (no auth required)
 * so the client can generate their copy of the sign-off document.
 */
class CertificateController extends ApiController
{
    public function actionPdf(): \yii\web\Response
    {
        try {
            $body   = Yii::$app->request->post();
            $client = $this->dataUrl($body, 'client_signature');
            $dev    = $this->dataUrl($body, 'developer_signature');
            $clientName = trim((string) ($body['client_name'] ?? ''));
            $devName    = trim((string) ($body['developer_name'] ?? ''));
            $date       = trim((string) ($body['date'] ?? date('Y-m-d')));
            if ($date === '') {
                $date = date('Y-m-d');
            }

            $html = $this->buildHtml($client, $dev, $clientName, $devName, $date);

            $options = new Options();
            $options->set('isRemoteEnabled', true);
            $options->set('isHtml5ParserEnabled', true);
            $dompdf = new Dompdf($options);
            $dompdf->loadHtml($html, 'UTF-8');
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();

            $resp = Yii::$app->response;
            $resp->format = Response::FORMAT_RAW;
            $resp->headers->set('Content-Type', 'application/pdf');
            $resp->headers->set('Content-Disposition', 'attachment; filename="Project_Completion_Certificate.pdf"');
            $resp->headers->set('Cache-Control', 'no-cache');
            $resp->data = $dompdf->output();
            return $resp;
        } catch (Throwable $e) {
            Yii::warning("Certificate PDF failed: {$e->getMessage()}", __METHOD__);
            $this->badRequest('Could not generate the PDF: ' . $e->getMessage());
            return $this->json(['ok' => false]); // unreachable; badRequest throws
        }
    }

    /** Accept a data URL or raw base64 and normalise it to a data URL for embedding. */
    private function dataUrl(array $body, string $key): string
    {
        $v = (string) ($body[$key] ?? '');
        if ($v === '') {
            return '';
        }

        $mime = 'image/png';
        if (preg_match('/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/is', $v, $m)) {
            $mime = strtolower($m[1]);
            $b64  = $m[2];
        } else {
            $b64 = $v;
            $mime = $this->sniffMime($b64);
        }

        $b64 = preg_replace('/\s+/', '', $b64);
        if ($b64 === '' || base64_decode($b64, true) === false) {
            return '';
        }
        return 'data:' . $mime . ';base64,' . $b64;
    }

    private function sniffMime(string $b64): string
    {
        $raw = base64_decode(preg_replace('/\s+/', '', $b64), true);
        if ($raw !== false && strncmp($raw, "\x89PNG", 4) === 0) {
            return 'image/png';
        }
        if ($raw !== false && strncmp($raw, "\xFF\xD8\xFF", 3) === 0) {
            return 'image/jpeg';
        }
        if ($raw !== false && strncmp($raw, "RIFF", 4) === 0 && strpos($raw, "WEBP") === 8) {
            return 'image/webp';
        }
        return 'image/png';
    }

    private function logo(): string
    {
        $path = Yii::getAlias('@app/assets/nss-logo.png');
        if (is_file($path)) {
            return 'data:image/png;base64,' . base64_encode((string) file_get_contents($path));
        }
        return '';
    }

    private function esc(string $s): string
    {
        return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    }

    private function sigImg(string $dataUrl): string
    {
        if ($dataUrl === '') {
            return '<div style="font-size:10px;color:#8a949e;">Signature</div>';
        }
        return '<img src="' . $this->esc($dataUrl) . '" style="max-height:52px;max-width:150px;">';
    }

    /** dompdf-friendly layout: tables + solid colours (no flexbox/gradients). */
    private function buildHtml(string $clientSig, string $devSig, string $clientName, string $devName, string $date): string
    {
        $logo = $this->logo();
        $features = [
            ['Complete Web Application & Admin Panel',
             'Full-featured frontend with a dedicated admin dashboard, role-based access (Super Admin, Admin, Teacher, Student), and a polished, responsive interface.'],
            ['Secure Authentication & Password Recovery',
             'Login/registration plus a fully working Forgot Password flow that emails a secure one-time code (OTP) via Gmail SMTP — configured and verified end-to-end.'],
            ['Push Notifications (Web)',
             'Firebase Cloud Messaging device registration and background/foreground notification delivery, working on real devices.'],
            ['User & Role Management',
             'Student, teacher, and admin management with pre-seeded test accounts assigned the correct roles and working credentials.'],
            ['Optimized Page Layout & Ad Integration',
             'Resolved layout/whitespace issues and integrated AdSense cleanly so pages display without gaps across Courses, Library, Videos, and more.'],
            ['Production Deployment & Delivery',
             'Automated build and deployment pipeline (CI/CD), tested in the live production environment with all core features verified.'],
        ];
        $featRows = '';
        $n = 1;
        foreach ($features as [$t, $d]) {
            $featRows .= '<tr>'
                . '<td style="width:34px;padding:7px 0;vertical-align:top;">'
                . '<div style="width:26px;height:26px;background-color:#0a5c3a;color:#fff;font-weight:bold;font-size:13px;text-align:center;line-height:26px;border-radius:6px;">' . $n . '</div>'
                . '</td>'
                . '<td style="padding:7px 0 7px 10px;vertical-align:top;">'
                . '<div style="font-size:13.5px;font-weight:bold;color:#1b1f23;">' . $this->esc($t) . '</div>'
                . '<div style="font-size:11px;color:#5c6770;margin-top:2px;">' . $this->esc($d) . '</div>'
                . '</td></tr>';
            $n++;
        }

        $clientLine = $clientName !== '' ? $this->esc($clientName) . ' &nbsp;·&nbsp; ' . $this->esc($date) : $this->esc($date);
        $devLine    = $devName    !== '' ? 'NextStage Software · ' . $this->esc($devName) : 'NextStage Software';

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family:'DejaVu Sans',sans-serif; color:#1b1f23; margin:0; }
  .mcell { background-color:#f4f7f5; border:1px solid #dde3e0; border-radius:8px; padding:11px 14px; }
  .mk { display:block; font-size:10px; letter-spacing:1.1px; text-transform:uppercase; color:#5c6770; }
  .mv { display:block; font-size:14px; font-weight:bold; margin-top:3px; }
</style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a5c3a;color:#fff;border-radius:10px;">
    <tr>
      <td style="width:92px;padding:18px;vertical-align:middle;">
        <img src="{$logo}" style="width:78px;background-color:#ffffff;border-radius:8px;padding:4px;">
      </td>
      <td style="padding:18px;vertical-align:middle;">
        <div style="font-size:23px;font-weight:bold;">NextStage Software</div>
        <div style="font-size:11px;color:#cfe7d9;">Software Development &amp; Digital Solutions</div>
        <div style="font-size:10px;margin-top:9px;display:inline-block;background-color:rgba(255,255,255,.15);padding:4px 12px;border-radius:99px;">Project Completion Certificate</div>
      </td>
    </tr>
  </table>

  <div style="text-align:center;margin:26px 0 4px;">
    <div style="font-size:27px;font-weight:bold;color:#0a5c3a;">The Project Is Complete</div>
    <div style="font-size:12px;color:#5c6770;margin-top:6px;">This document certifies the delivery and acceptance of the completed project.</div>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
    <tr>
      <td style="width:50%;padding:0 4px 0 0;"><div class="mcell"><span class="mk">Client / Project</span><span class="mv">Bengali Islamic Institute</span></div></td>
      <td style="width:50%;padding:0 0 0 4px;"><div class="mcell"><span class="mk">Delivered By</span><span class="mv">NextStage Software</span></div></td>
    </tr>
    <tr>
      <td style="padding:4px 4px 0 0;"><div class="mcell"><span class="mk">Scope</span><span class="mv">Web Application &amp; Admin Panel</span></div></td>
      <td style="padding:4px 0 0 4px;"><div class="mcell"><span class="mk">Status</span><span class="mv" style="color:#0a5c3a;">Delivered &amp; Accepted</span></div></td>
    </tr>
  </table>

  <div style="font-size:15px;font-weight:bold;color:#0a5c3a;margin:22px 0 8px;border-bottom:1px solid #dde3e0;padding-bottom:6px;">Following Features Are Added</div>
  <table width="100%" cellpadding="0" cellspacing="0">
    {$featRows}
  </table>

  <div style="margin:20px 0;padding:15px 20px;background-color:#eaf6ef;border:1px solid #cfe7d9;border-radius:10px;text-align:center;">
    <div style="font-size:18px;font-weight:bold;color:#0a5c3a;">The client got everything working</div>
    <div style="font-size:11.5px;color:#5c6770;margin-top:4px;">All agreed features have been implemented, tested, and confirmed operational in the production environment.</div>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td style="width:50%;padding:0 12px 0 0;vertical-align:top;">
        <div style="border-top:2px solid #1b1f23;padding-top:8px;min-height:56px;">{$this->sigImg($clientSig)}</div>
        <div style="font-size:12px;color:#5c6770;margin-top:8px;">Client Signature</div>
        <div style="font-size:11px;color:#5c6770;margin-top:2px;">{$clientLine}</div>
      </td>
      <td style="width:50%;padding:0 0 0 12px;vertical-align:top;">
        <div style="border-top:2px solid #0a5c3a;padding-top:8px;min-height:56px;">{$this->sigImg($devSig)}</div>
        <div style="font-size:12px;color:#5c6770;margin-top:8px;">Developer Signature</div>
        <div style="font-size:11px;color:#5c6770;margin-top:2px;">{$devLine}</div>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }
}
