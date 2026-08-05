<?php

use yii\db\Migration;

/**
 * Add file_url, file_type, file_size columns to books table for document uploads.
 * Migrates existing pdf_url data into file_url for backward compatibility.
 */
class m250806_000012_library_documents extends Migration
{
    public function safeUp()
    {
        // Add new columns for document file storage
        $this->addColumn('books', 'file_url', $this->string(1024)->notNull()->defaultValue('')->after('cover_image'));
        $this->addColumn('books', 'file_type', $this->string(32)->notNull()->defaultValue('')->after('file_url'));
        $this->addColumn('books', 'file_size', $this->bigInteger()->notNull()->defaultValue(0)->after('file_type'));

        // Migrate existing pdf_url data into file_url
        $this->execute("UPDATE books SET file_url = pdf_url, file_type = 'pdf' WHERE pdf_url != '' AND file_url = ''");
    }

    public function safeDown()
    {
        $this->dropColumn('books', 'file_size');
        $this->dropColumn('books', 'file_type');
        $this->dropColumn('books', 'file_url');
    }
}
