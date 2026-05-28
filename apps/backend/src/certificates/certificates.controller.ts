import { Controller, Post, Get, Param, UseGuards, Body, Header, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@ApiTags('certificates')
@Controller('v1/certificates')
export class CertificatesController {
  constructor(
    private certificatesService: CertificatesService,
    private certificatePdfService: CertificatePdfService,
    private configService: ConfigService,
  ) {}

  @Post(':userId/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Issue a certificate for a completed course' })
  async issueCertificate(@Param('userId') userId: string, @Param('courseId') courseId: string) {
    return this.certificatesService.issueCertificate(userId, courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a certificate by ID' })
  async getCertificate(@Param('id') id: string) {
    return this.certificatesService.getCertificate(id);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all certificates for a user' })
  async getUserCertificates(@Param('userId') userId: string) {
    return this.certificatesService.getUserCertificates(userId);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify a certificate by hash' })
  async verifyCertificate(@Body() body: { certificateHash: string }) {
    return this.certificatesService.verifyCertificate(body.certificateHash);
  }

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Download a certificate as a branded PDF with QR code' })
  @ApiResponse({ status: 200, description: 'PDF certificate' })
  async downloadPdf(@Param('id') id: string): Promise<StreamableFile> {
    const certificate = await this.certificatesService.getCertificateWithRelations(id);
    const baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const pdf = await this.certificatePdfService.generateCertificatePdf(certificate, baseUrl);
    return new StreamableFile(pdf, {
      disposition: `attachment; filename="certificate-${id}.pdf"`,
      type: 'application/pdf',
    });
  }
}
